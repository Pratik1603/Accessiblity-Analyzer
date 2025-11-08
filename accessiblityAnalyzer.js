// accessibilityAnalyzer.js
const puppeteer = require('puppeteer');
const { AxePuppeteer } = require('@axe-core/puppeteer');
const ColorContrastChecker = require('color-contrast-checker');
const { createCanvas } = require('canvas');
const path = require("path");
const fs = require("fs");
const { text } = require('stream/consumers');

class AccessibilityAnalyzer {
  constructor(options = {}) {
    this.browser = null;
    this.page = null;
    this.ccc = new ColorContrastChecker();
    this.options = options || {};
    // Where screenshots / html should be written. Default to the frontend screenshots folder (backwards compatible)
    this.outputDir = this.options.outputDir
      ? path.resolve(this.options.outputDir)
      : path.resolve('./frontend/my-project/public/screenshots');
    this.launchOptions = this.options.launchOptions || {
      headless: false, // See what's happening by default for local dev
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    // Whether to bypass the page Content-Security-Policy during analysis (default: true)
    this.bypassCSP = this.options.bypassCSP !== undefined ? !!this.options.bypassCSP : true;
  }


  async initialize() {

    this.browser = await puppeteer.launch(this.launchOptions);
    this.page = await this.browser.newPage();
    // Optionally bypass Content-Security-Policy so injected scripts and requests aren't blocked by page CSP
    try {
      if (this.bypassCSP && this.page.setBypassCSP) {
        await this.page.setBypassCSP(true);
      }
    } catch (e) {
      console.warn('Could not set bypassCSP on page:', e && e.message);
    }
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9'
    });
    await this.page.setViewport({ width: 1920, height: 1080 });

  }

  async captureIssuesScreenshot(issues, groupName = "issues") {
    if (!issues || issues.length === 0) return null;

    this.page.on("console", msg => console.log("BROWSER LOG:", msg.text()));
    await this.page.setViewport({ width: 800, height: 600 });

    await this.page.evaluate((issues) => {
      // 1. Inject styles for highlights + circular labels
      if (!document.getElementById("a11y-highlight-style")) {
        const style = document.createElement("style");
        style.id = "a11y-highlight-style";
        style.innerHTML = `
        .a11y-issue-error {
          outline: 4px solid red;
          outline-offset: 2px;
          z-index: 2147483647;
          box-shadow: 0 0 0 4px rgba(255,0,0,0.7);
          position: relative;
        }
        .a11y-issue-warning {
          outline: 4px solid orange;
          outline-offset: 2px;
          z-index: 2147483647;
          box-shadow: 0 0 0 4px rgba(255,165,0,0.7);
          position: relative;
        }
        .a11y-label {
          position: absolute;
          width: 20px;
          height: 20px;
          line-height: 20px;
          text-align: center;
          border-radius: 50%;
          font-size: 11px;
          font-weight: bold;
          font-family: Arial, sans-serif;
          color: white;
          z-index: 2147483647;
          pointer-events: none;
          border: 2px solid white;
          box-shadow: 0 0 2px rgba(0,0,0,0.5);
        }
        .a11y-label.error {
          background-color: red;
        }
        .a11y-label.warning {
          background-color: orange;
        }
      `;
        document.head.appendChild(style);
      }

      function normalizeText(str) {
        return str.replace(/\s+/g, " ").trim();
      }

      function findElement(item) {
        try {
          // 1. Try XPath
          if (item.element.startsWith("/") || item.element.startsWith(".")) {
            const el = document.evaluate(
              item.element,
              document,
              null,
              XPathResult.FIRST_ORDERED_NODE_TYPE,
              null
            ).singleNodeValue;
            if (el) return el;
          }

          // 2. Try CSS selector
          try {
            const el = document.querySelector(item.element);
            if (el) return el;
          } catch { }

          // 3. Try "tag: 'innerText'" format
          const match = item.element.match(/^(\w+):\s*["'](.+)["']$/);
          if (match) {
            const [_, tag, text] = match;
            const nodes = document.querySelectorAll(tag);
            for (const node of nodes) {
              if (normalizeText(node.textContent).includes(normalizeText(text))) {
                return node;
              }
            }
          }

          return null;
        } catch {
          return null;
        }
      }

      // Clean up previous highlights and labels
      document.querySelectorAll(".a11y-issue-error, .a11y-issue-warning").forEach(el => {
        el.classList.remove("a11y-issue-error", "a11y-issue-warning");
      });
      document.querySelectorAll(".a11y-label").forEach(label => label.remove());

      let errorCount = 0;
      let warningCount = 0;

      // Highlight + label issues
      issues.forEach((issue, index) => {
        const el = findElement(issue);
        if (!el) {
          console.warn("No element found for issue:", issue.element);
          return;
        }

        const style = window.getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
          el.style.display = "block";
          el.style.visibility = "visible";
          el.style.opacity = "1";
        }

        el.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });

        if (issue.type === "error") {
          el.classList.add("a11y-issue-error");
          errorCount++;
        } else if (issue.type === "warning") {
          el.classList.add("a11y-issue-warning");
          warningCount++;
        }

        // Add circular label
        const rect = el.getBoundingClientRect();
        const label = document.createElement("div");
        label.className = `a11y-label ${issue.type}`;
        label.textContent = index + 1;
        label.style.top = `${window.scrollY + rect.top - 14}px`;  // Keep at top
        label.style.left = `${window.scrollX + rect.left + (rect.width / 2) - 10}px`;
        document.body.appendChild(label);
      });

      console.log(`🔹 Highlighted ${errorCount} errors and ${warningCount} warnings`);
    }, issues);

    // Ensure output dir exists and save screenshot
    try {
      const outDir = this.outputDir;
      const screenshotPath = path.resolve(path.join(outDir, `${groupName}-${Date.now()}.png`));
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      return screenshotPath;
    } catch (err) {
      console.warn('Failed to save screenshot:', err.message);
      return null;
    }
  }

  async closePopups() {
    try {
      // Run in page context
      await this.page.evaluate(() => {
        // List of popup-like selectors
        const popupSelectors = [
          '.popup', '.modal', '.overlay', '.cookie', '.newsletter', '#cookie-banner',
          '.cookie-consent', '.gdpr', '#gdpr', '#consent', '.lightbox'
        ];

        // Try removing directly
        popupSelectors.forEach(sel => {
          document.querySelectorAll(sel).forEach(el => {
            console.log("Closing popup via removal:", sel);
            el.remove();
          });
        });

        // Also try clicking close buttons
        const closeButtons = document.querySelectorAll(
          'button[aria-label="Close"], .close, .btn-close, .popup-close, .modal-close'
        );
        closeButtons.forEach(btn => {
          try {
            console.log("Clicking close button:", btn);
            btn.click();
          } catch { }
        });
      });

      console.log("✅ Popup cleanup executed");
    } catch (err) {
      console.warn("⚠️ Popup cleanup failed:", err.message);
    }
  }



  async analyze(url) {
    try {
      if (!this.browser) {
        await this.initialize();
      }

      console.log(`Analyzing: ${url}`);

      // Navigate to the page
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });


      // Wait a bit more for dynamic content
      await new Promise(res => setTimeout(res, 15000));

      await this.closePopups();
      await new Promise(res => setTimeout(res, 5000));
      await this.closePopups(); // run again in case popup came later
      // Run all analysis checks
      const [

        imageAnalysis,
        headingAnalysis,
        colorContrastAnalysis,
        keyboardNavAnalysis,
        ariaAnalysis,
        formAnalysis,
        languageAnalysis,
        landmarkAnalysis,
        metaAnalysis
      ] = await Promise.all([

        this.analyzeImages(),
        this.analyzeHeadings(),
        this.analyzeColorContrast(),
        this.analyzeKeyboardNavigation(),
        this.analyzeAriaLabels(),
        this.analyzeForms(),
        this.analyzeLanguage(),
        this.analyzeLandmarks(),
        this.analyzeMetaInfo()
      ]);

      // Calculate overall score
      const overallScore = this.calculateScore({

        imageAnalysis,
        headingAnalysis,
        colorContrastAnalysis,
        keyboardNavAnalysis,
        ariaAnalysis,
        formAnalysis,
        languageAnalysis,
        landmarkAnalysis
      });

      if (colorContrastAnalysis.issues.length > 0) {

        const screenshotPath = await this.captureIssuesScreenshot(
          colorContrastAnalysis.issues,
          "color-contrast"
        );

        colorContrastAnalysis.screenshot = screenshotPath;
      }

      if (imageAnalysis.issues.length > 0) {

        const screenshotPath = await this.captureIssuesScreenshot(
          imageAnalysis.issues,
          "image"
        );

        imageAnalysis.screenshot = screenshotPath;
      }
      if (headingAnalysis.issues.length > 0) {

        const screenshotPath = await this.captureIssuesScreenshot(
          headingAnalysis.issues,
          "heading"
        );

        headingAnalysis.screenshot = screenshotPath;
      }
      if (keyboardNavAnalysis.issues.length > 0) {

        const screenshotPath = await this.captureIssuesScreenshot(
          keyboardNavAnalysis.issues,
          "keyboard-navigation"
        );

        keyboardNavAnalysis.screenshot = screenshotPath;
      }
      if (ariaAnalysis.issues.length > 0) {

        const screenshotPath = await this.captureIssuesScreenshot(
          ariaAnalysis.issues,
          "aria"
        );

        ariaAnalysis.screenshot = screenshotPath;
      } if (formAnalysis.issues.length > 0) {

        const screenshotPath = await this.captureIssuesScreenshot(
          formAnalysis.issues,
          "form"
        );

        formAnalysis.screenshot = screenshotPath;
      } if (languageAnalysis.issues.length > 0) {

        const screenshotPath = await this.captureIssuesScreenshot(
          languageAnalysis.issues,
          "language"
        );

        languageAnalysis.screenshot = screenshotPath;
      } if (landmarkAnalysis.issues.length > 0) {

        const screenshotPath = await this.captureIssuesScreenshot(
          landmarkAnalysis.issues,
          "landmark"
        );

        landmarkAnalysis.screenshot = screenshotPath;
      }
      if (metaAnalysis.issues.length > 0) {
        const screenshotPath = await this.captureIssuesScreenshot(
          metaAnalysis.issues,
          "meta"
        );

        metaAnalysis.screenshot = screenshotPath;
      }
      const ariaArr = ariaAnalysis.issues;
      const imageArr = imageAnalysis.issues;
      const screenReaderIssues = [...ariaArr, ...imageArr];

      if (screenReaderIssues.length > 0) {
        try {
          const screenshotPath = await this.captureIssuesScreenshot(
            screenReaderIssues,
            "grouped-screenreader"
          );

          summary.screenReaderScreenshot = screenshotPath;
          console.log("✅ Screen Reader screenshot captured:", screenshotPath);
        } catch (err) {
          console.warn("⚠️ Failed to capture screen reader screenshot:", err.message);
        }
      }



      return {
        url,
        timestamp: new Date().toISOString(),
        score: overallScore,

        customChecks: {
          images: imageAnalysis,
          headings: headingAnalysis,
          colorContrast: colorContrastAnalysis,
          keyboardNavigation: keyboardNavAnalysis,
          aria: ariaAnalysis,
          forms: formAnalysis,
          language: languageAnalysis,
          landmarks: landmarkAnalysis,
          meta: metaAnalysis
        },
        summary: await this.generateSummary({

          imageAnalysis,
          headingAnalysis,
          colorContrastAnalysis,
          keyboardNavAnalysis,
          ariaAnalysis,
          formAnalysis,
          languageAnalysis,
          landmarkAnalysis
        })
      };
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }




  // 2. IMAGE ANALYSIS
  async analyzeImages() {
    const images = await this.page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.map(img => {
        const rect = img.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;
        const altText = img.getAttribute('alt');
        const ariaLabel = img.getAttribute('aria-label');
        const ariaLabelledby = img.getAttribute('aria-labelledby');
        const role = img.getAttribute('role');

        // Check if image is decorative
        const isDecorative = role === 'presentation' || altText === '';

        // Check parent link
        const parentLink = img.closest('a');
        const isLinkedImage = !!parentLink;

        return {
          src: img.src,
          alt: altText,
          hasAlt: altText !== null,
          altQuality: altText ? (altText.length > 0 && altText.length < 125 ? 'good' : 'poor') : 'missing',
          ariaLabel,
          ariaLabelledby,
          isDecorative,
          isVisible,
          isLinkedImage,
          linkText: parentLink ? parentLink.textContent.trim() : null,
          width: rect.width,
          height: rect.height,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          isLazyLoaded: img.loading === 'lazy',
          xpath: getXPath(img)
        };
      });

      function getXPath(element) {
        if (element.id && document.querySelectorAll('#' + CSS.escape(element.id)).length === 1) {
          // Unique ID: Use the shortest possible XPath
          return '//*[@id="' + element.id + '"]';
        }
        if (element === document.documentElement) {
          return '/html';
        }
        if (element === document.body) {
          return '/html/body';
        }
        let ix = 1;
        let siblings = element.parentNode ? element.parentNode.children : [];
        for (let i = 0; i < siblings.length; i++) {
          let sibling = siblings[i];
          if (sibling === element) {
            let parentXPath = getXPath(element.parentNode);
            let tagName = element.tagName.toLowerCase();
            return parentXPath + '/' + tagName + '[' + ix + ']';
          }
          if (sibling.tagName === element.tagName) {
            ix++;
          }
        }
      }

    });

    const issues = [];


    images.forEach(img => {
      if (img.isVisible && !img.isDecorative) {
        if (!img.hasAlt && !img.ariaLabel && !img.ariaLabelledby) {
          issues.push({
            type: 'error',
            message: `Image missing alt text: <a href="${img.src}" target="_blank">image</a>`,
            element: img.xpath,
            impact: 'critical',
            category: 'images'
          });
        } else if (img.altQuality === 'poor') {
          issues.push({
            type: 'warning',
            message: `Alt text may be too long or too short: <a href="${img.alt}" target="_blank">image</a>`,
            element: img.xpath,
            impact: 'minor',
            category: 'images'
          });
        }

        if (img.isLinkedImage && !img.alt && !img.linkText) {
          issues.push({
            type: 'error',
            message: `Linked image without descriptive text: <a href="${img.src}" target="_blank">image</a>`,
            element: img.xpath,
            impact: 'serious',
            category: 'images'
          });
        }
      }
    });

    return {
      total: images.length,
      withAlt: images.filter(img => img.hasAlt).length,
      decorative: images.filter(img => img.isDecorative).length,
      issues,
      details: images
    };
  }

  // 3. HEADING ANALYSIS
  async analyzeHeadings() {
    const headings = await this.page.evaluate(() => {
      const allHeadings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      let previousLevel = 0;
      const hierarchy = [];
      const issues = [];

      function getXPath(element) {
        if (element.id && document.querySelectorAll('#' + CSS.escape(element.id)).length === 1) {
          // Unique ID: Use the shortest possible XPath
          return '//*[@id="' + element.id + '"]';
        }
        if (element === document.documentElement) {
          return '/html';
        }
        if (element === document.body) {
          return '/html/body';
        }
        let ix = 1;
        let siblings = element.parentNode ? element.parentNode.children : [];
        for (let i = 0; i < siblings.length; i++) {
          let sibling = siblings[i];
          if (sibling === element) {
            let parentXPath = getXPath(element.parentNode);
            let tagName = element.tagName.toLowerCase();
            return parentXPath + '/' + tagName + '[' + ix + ']';
          }
          if (sibling.tagName === element.tagName) {
            ix++;
          }
        }
      }


      allHeadings.forEach((heading, index) => {
        const level = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent.trim();
        const rect = heading.getBoundingClientRect();
        const isVisible = rect.width > 0 && rect.height > 0;

        // Check for skipped levels
        if (previousLevel > 0 && level > previousLevel + 1) {
          issues.push({
            type: 'error',
            message: `Skipped heading level: h${previousLevel} to h${level}`,
            element: getXPath(heading),
            text: text,
            impact: 'moderate',
            category: 'headings'

          });
        }

        // Check for empty headings
        if (text.length === 0) {
          issues.push({
            type: 'error',
            message: `Empty heading found: h${level}`,
            element: getXPath(heading),
            impact: 'serious',
            category: 'headings'
          });
        }

        hierarchy.push({
          level,
          text,
          isVisible,
          length: text.length,
          index
        });

        if (isVisible) {
          previousLevel = level;
        }
      });

      // Check for multiple h1s
      const h1Count = hierarchy.filter(h => h.level === 1).length;
      if (h1Count === 0) {
        issues.push({
          type: 'error',
          message: 'No h1 heading found on the page',
          impact: 'serious',
          category: 'headings'
        });
      } else if (h1Count > 1) {
        issues.push({
          type: 'warning',
          message: `Multiple h1 headings found (${h1Count})`,
          impact: 'moderate',
          category: 'headings'
        });
      }

      return {
        hierarchy,
        issues,
        h1Count,
        totalCount: allHeadings.length
      };
    });

    return headings;
  }

  // 4. COLOR CONTRAST ANALYSIS
  async analyzeColorContrast() {
    // Collect text elements + computed colors
    const contrastData = await this.page.evaluate(() => {



      function parseGradient(bgImage) {
        // Very simple parser: just take the first color stop
        const match = bgImage.match(/rgb[a]?\([^)]+\)/);
        return match ? match[0] : null;
      }

      function getEffectiveBackground(e, depth = 0) {
        if (!e || depth > 10) return 'rgb(255,255,255)'; // fallback
        const styles = window.getComputedStyle(e);

        const bgColor = styles.backgroundColor;
        const bgImage = styles.backgroundImage;
        console.log(bgImage);
        // If gradient is present → pick first stop
        if (bgImage && bgImage !== 'none') {
          const gradColor = parseGradient(bgImage);
          if (gradColor) return gradColor;
        }

        // If solid background
        if (
          bgColor &&
          bgColor !== 'transparent' &&
          bgColor !== 'rgba(0, 0, 0, 0)'
        ) {
          return bgColor;
        }

        // Else climb up
        return getEffectiveBackground(e.parentElement, depth + 1);
      }

      const elements = Array.from(document.querySelectorAll('*'));
      const textElements = [];
      function getXPath(element) {
        if (element.id && document.querySelectorAll('#' + CSS.escape(element.id)).length === 1) {
          // Unique ID: Use the shortest possible XPath
          return '//*[@id="' + element.id + '"]';
        }
        if (element === document.documentElement) {
          return '/html';
        }
        if (element === document.body) {
          return '/html/body';
        }
        let ix = 1;
        let siblings = element.parentNode ? element.parentNode.children : [];
        for (let i = 0; i < siblings.length; i++) {
          let sibling = siblings[i];
          if (sibling === element) {
            let parentXPath = getXPath(element.parentNode);
            let tagName = element.tagName.toLowerCase();
            return parentXPath + '/' + tagName + '[' + ix + ']';
          }
          if (sibling.tagName === element.tagName) {
            ix++;
          }
        }
      }

      elements.forEach(el => {
        if (el.childNodes && el.childNodes.length > 0) {
          for (let node of el.childNodes) {
            if (node.nodeType === 3 && node.textContent.trim().length > 0) {
              const styles = window.getComputedStyle(el);
              const rect = el.getBoundingClientRect();

              if (rect.width > 0 && rect.height > 0) {
                const fontSize = parseFloat(styles.fontSize);
                const fontWeight =
                  styles.fontWeight === 'bold' ? 700 : parseInt(styles.fontWeight) || 400;

                textElements.push({
                  text: node.textContent.trim().substring(0, 50),
                  color: styles.color,
                  backgroundColor: getEffectiveBackground(el),
                  fontSize,
                  fontWeight,
                  tagName: el.tagName.toLowerCase(),
                  isLargeText:
                    fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700),
                  xPath: getXPath(el)
                });
              }
              break; // only first text node
            }
          }
        }
      });

      return textElements;
    });

    // 🔹 Now analyze contrast outside page.evaluate
    const issues = [];


    for (const element of contrastData) {
      if (element.color && element.backgroundColor) {

        try {
          const ratio = this.calculateContrastRatio(
            element.color,
            element.backgroundColor
          );

          const requiredRatio = element.isLargeText ? 3 : 4.5;
          const enhancedRatio = element.isLargeText ? 4.5 : 7;

          if (ratio < requiredRatio) {

            issues.push({
              type: 'error',
              message: `Insufficient color contrast ratio: ${ratio.toFixed(
                2
              )} (required: ${requiredRatio})`,
              element: element.xPath,
              text: element.text,

              impact: 'serious',
              details: {

                color: element.color,
                backgroundColor: element.backgroundColor,
                ratio,
                required: requiredRatio
              },
              category: 'color-contrast'
            });
          } else if (ratio < enhancedRatio) {
            issues.push({
              type: 'warning',
              message: `Color contrast meets AA but not AAA: ${ratio.toFixed(2)}`,
              element: element.xPath,
              text: element.text,
              impact: 'minor',
              category: 'color-contrast'
            });
          }
        } catch (e) {
          console.warn('Contrast calc error:', e.message);
        }
      }
    }

    return {
      totalElements: contrastData.length,
      issues
    };
  }



  // 5. KEYBOARD NAVIGATION ANALYSIS
  async analyzeKeyboardNavigation() {
    const keyboardData = await this.page.evaluate(() => {
      const focusableElements = Array.from(document.querySelectorAll(
        'a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"]), [contenteditable]'
      ));

      function getXPath(element) {
        if (element.id && document.querySelectorAll('#' + CSS.escape(element.id)).length === 1) {
          // Unique ID: Use the shortest possible XPath
          return '//*[@id="' + element.id + '"]';
        }
        if (element === document.documentElement) {
          return '/html';
        }
        if (element === document.body) {
          return '/html/body';
        }
        let ix = 1;
        let siblings = element.parentNode ? element.parentNode.children : [];
        for (let i = 0; i < siblings.length; i++) {
          let sibling = siblings[i];
          if (sibling === element) {
            let parentXPath = getXPath(element.parentNode);
            let tagName = element.tagName.toLowerCase();
            return parentXPath + '/' + tagName + '[' + ix + ']';
          }
          if (sibling.tagName === element.tagName) {
            ix++;
          }
        }
      }

      const tabOrderIssues = [];
      const focusIndicatorIssues = [];

      focusableElements.forEach((el, index) => {
        const tabindex = el.getAttribute('tabindex');

        // Check for positive tabindex (bad practice)
        if (tabindex && parseInt(tabindex) > 0) {
          tabOrderIssues.push({
            type: 'warning',
            message: `Positive tabindex found (${tabindex})`,
            element: getXPath(el),
            text: el.text,
            impact: 'moderate',
            category: 'keyboard-navigation'
          });
        }

        // Check for focus indicators
        el.focus();
        const focusStyles = window.getComputedStyle(el);

        if (focusStyles.outline === 'none' && focusStyles.boxShadow === 'none') {
          focusIndicatorIssues.push({
            type: 'warning',
            message: 'Element may lack visible focus indicator',
            element: getXPath(el),
            text: el.text,
            impact: 'serious',
            category: 'keyboard-navigation'
          });
        }
      });

      // Check for skip links
      const firstLink = document.querySelector('a[href]');
      const hasSkipLink = firstLink &&
        (firstLink.textContent.toLowerCase().includes('skip') ||
          firstLink.getAttribute('href') === '#main' ||
          firstLink.getAttribute('href') === '#content');

      return {
        totalFocusable: focusableElements.length,
        tabOrderIssues,
        focusIndicatorIssues,
        hasSkipLink,
        focusableElements: focusableElements.map(el => ({
          tag: el.tagName.toLowerCase(),
          type: el.type || null,
          tabindex: el.getAttribute('tabindex'),
          text: el.textContent.trim().substring(0, 30)
        }))
      };
    });

    const issues = [
      ...keyboardData.tabOrderIssues,
      ...keyboardData.focusIndicatorIssues
    ];

    if (!keyboardData.hasSkipLink) {
      issues.push({
        type: 'warning',
        message: 'No skip navigation link detected',
        impact: 'moderate',
        category: 'keyboard-navigation'
      });
    }

    return {
      ...keyboardData,
      issues
    };
  }

  // 6. ARIA LABELS ANALYSIS
  async analyzeAriaLabels() {
    this.page.on("console", msg => console.log("BROWSER LOG:", msg.text()));

    const ariaData = await this.page.evaluate(() => {
      const elementsWithAria = Array.from(document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [role]'));
      const issues = [];
      function getXPath(element) {
        if (element.id && document.querySelectorAll('#' + CSS.escape(element.id)).length === 1) {
          // Unique ID: Use the shortest possible XPath
          return '//*[@id="' + element.id + '"]';
        }
        if (element === document.documentElement) {
          return '/html';
        }
        if (element === document.body) {
          return '/html/body';
        }
        let ix = 1;
        let siblings = element.parentNode ? element.parentNode.children : [];
        for (let i = 0; i < siblings.length; i++) {
          let sibling = siblings[i];
          if (sibling === element) {
            let parentXPath = getXPath(element.parentNode);
            let tagName = element.tagName.toLowerCase();
            return parentXPath + '/' + tagName + '[' + ix + ']';
          }
          if (sibling.tagName === element.tagName) {
            ix++;
          }
        }
      }


      // Check for proper ARIA implementation
      elementsWithAria.forEach(el => {
        const ariaLabel = el.getAttribute('aria-label');
        const ariaLabelledby = el.getAttribute('aria-labelledby');
        const ariaDescribedby = el.getAttribute('aria-describedby');
        const role = el.getAttribute('role');
        // Check if aria-labelledby references exist
        if (ariaLabelledby) {
          const ids = ariaLabelledby.split(' ');
          ids.forEach(id => {
            if (!document.getElementById(id)) {
              issues.push({
                type: 'error',
                message: `aria-labelledby references non-existent ID: ${id}`,
                element: getXPath(el),
                text: el.text,
                impact: 'serious',
                category: 'aria'
              });
            }
          });
        }

        // Check if aria-describedby references exist
        if (ariaDescribedby) {
          const ids = ariaDescribedby.split(' ');
          ids.forEach(id => {
            if (!document.getElementById(id)) {
              issues.push({
                type: 'error',
                message: `aria-describedby references non-existent ID: ${id}`,
                element: getXPath(el),
                text: el.text,
                impact: 'moderate',
                category: 'aria'
              });
            }
          });
        }

        // Check for redundant ARIA





        // Check for empty aria-label
        if (ariaLabel !== null && ariaLabel.trim() === '') {
          issues.push({
            type: 'error',
            message: 'Empty aria-label attribute',
            element: getXPath(el),
            text: el.text,
            impact: 'serious',
            category: 'aria'
          });
        }
      });
      const implicitRoles = {
        a: el => (el.hasAttribute('href') ? 'link' : null),
        button: () => 'button',
        h1: () => 'heading',
        h2: () => 'heading',
        h3: () => 'heading',
        h4: () => 'heading',
        h5: () => 'heading',
        h6: () => 'heading',
        li: () => 'listitem',
        ul: () => 'list',
        ol: () => 'list',
        table: () => 'table',
        th: () => 'columnheader',
        tr: () => 'row',
        td: () => 'cell',
        img: el => (el.getAttribute('alt') === '' ? 'presentation' : 'img'),
        input: el => {
          const type = el.getAttribute('type') || 'text';
          switch (type) {
            case 'checkbox':
              return 'checkbox';
            case 'radio':
              return 'radio';
            case 'range':
              return 'slider';
            case 'button':
            case 'submit':
            case 'reset':
              return 'button';
            default:
              return 'textbox';
          }
        }
      };

      document.querySelectorAll('[role]').forEach(el => {
        const role = el.getAttribute('role');
        const tag = el.tagName.toLowerCase();

        if (implicitRoles[tag]) {
          const implicit = implicitRoles[tag](el);
          if (implicit && role == implicit) {
            issues.push({
              type: 'warning',
              message: `Redundant role '${role}' on <${tag}> (already implicit)`,
              element: getXPath(el),
              text: el.text,
              impact: 'minor',
              category: 'aria'
            });
          }
        }

      });
      // Check interactive elements without accessible names
      const interactiveElements = Array.from(document.querySelectorAll('button, a, input:not([type="hidden"]), select, textarea'));

      interactiveElements.forEach(el => {
        const hasAriaLabel = el.hasAttribute('aria-label');
        const hasAriaLabelledby = el.hasAttribute('aria-labelledby');
        const hasText = el.textContent.trim().length > 0;
        const hasValue = el.value && el.value.trim().length > 0;
        const hasTitle = el.title && el.title.trim().length > 0;

        if (!hasAriaLabel && !hasAriaLabelledby && !hasText && !hasValue && !hasTitle) {

          issues.push({
            type: 'error',
            message: 'Interactive element without accessible name',
            element: getXPath(el),
            text: el.text,
            impact: 'critical',
            category: 'aria'
          });
        }
      });

      return {
        totalAriaElements: elementsWithAria.length,
        issues
      };
    });

    return ariaData;
  }

  // 7. FORM ANALYSIS
  async analyzeForms() {
    const formData = await this.page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
      const issues = [];
      function getXPath(element) {
        if (element.id && document.querySelectorAll('#' + CSS.escape(element.id)).length === 1) {
          // Unique ID: Use the shortest possible XPath
          return '//*[@id="' + element.id + '"]';
        }
        if (element === document.documentElement) {
          return '/html';
        }
        if (element === document.body) {
          return '/html/body';
        }
        let ix = 1;
        let siblings = element.parentNode ? element.parentNode.children : [];
        for (let i = 0; i < siblings.length; i++) {
          let sibling = siblings[i];
          if (sibling === element) {
            let parentXPath = getXPath(element.parentNode);
            let tagName = element.tagName.toLowerCase();
            return parentXPath + '/' + tagName + '[' + ix + ']';
          }
          if (sibling.tagName === element.tagName) {
            ix++;
          }
        }
      }

      // Check each input for proper labeling
      inputs.forEach(input => {
        const id = input.id;
        const name = input.name;
        const type = input.type || 'text';
        const hasAriaLabel = input.hasAttribute('aria-label');
        const hasAriaLabelledby = input.hasAttribute('aria-labelledby');
        const hasPlaceholder = input.hasAttribute('placeholder');

        // Check for associated label
        let hasLabel = false;
        if (id) {
          const label = document.querySelector(`label[for="${id}"]`);
          hasLabel = !!label;
        }

        // Check if input is wrapped in label
        const parentLabel = input.closest('label');
        if (parentLabel) {
          hasLabel = true;
        }

        if (!hasLabel && !hasAriaLabel && !hasAriaLabelledby && !hasPlaceholder) {
          issues.push({
            type: 'error',
            message: `Form input without label: ${type} input${name ? ` (name: ${name})` : ''}`,
            element: input.tagName.toLowerCase() + (id ? `#${id}` : ''),
            text: input.text,
            impact: 'critical',
            category: 'forms'
          });
        }

        // Check for placeholder as sole label (bad practice)
        if (hasPlaceholder && !hasLabel && !hasAriaLabel) {
          issues.push({
            type: 'warning',
            message: 'Form input using placeholder as sole label',
            element: getXPath(input),
            text: input.text,
            impact: 'moderate',
            category: 'forms'
          });
        }

        // Check for required fields
        if (input.hasAttribute('required')) {
          const hasAriaRequired = input.getAttribute('aria-required') === 'true';
          if (!hasAriaRequired) {
            issues.push({
              type: 'warning',
              message: 'Required field missing aria-required attribute',
              element: getXPath(input),
              text: input.text,
              impact: 'minor',
              category: 'forms'
            });
          }
        }
      });

      // Check for form validation messages
      forms.forEach(form => {
        const hasAriaLive = form.querySelector('[aria-live]');
        const hasAriaDescribedby = form.querySelector('[aria-describedby]');

        if (!hasAriaLive && !hasAriaDescribedby) {
          issues.push({
            type: 'warning',
            message: 'Form may lack proper error announcement setup',
            element: 'form',
            impact: 'moderate',
            category: 'forms'
          });
        }
      });

      // Check for fieldsets and legends
      const fieldsets = Array.from(document.querySelectorAll('fieldset'));
      fieldsets.forEach(fieldset => {
        const legend = fieldset.querySelector('legend');
        if (!legend || legend.textContent.trim() === '') {
          issues.push({
            type: 'error',
            message: 'Fieldset without legend',
            element: getXPath(fieldset),
            text: fieldset.text,
            impact: 'moderate',
            category: 'forms'
          });
        }
      });

      return {
        totalForms: forms.length,
        totalInputs: inputs.length,
        issues
      };
    });

    return formData;
  }

  // 8. LANGUAGE ANALYSIS
  async analyzeLanguage() {
    const languageData = await this.page.evaluate(() => {
      const html = document.documentElement;
      const lang = html.getAttribute('lang');
      const issues = [];

      if (!lang) {
        issues.push({
          type: 'error',
          message: 'Page language not specified',
          element: 'html',
          impact: 'serious',
          category: 'language'
        });
      } else if (lang.length < 2) {
        issues.push({
          type: 'error',
          message: `Invalid language code: ${lang}`,
          element: 'html',
          impact: 'serious',
          category: 'language'
        });
      }

      // Check for language changes in content
      const elementsWithLang = Array.from(document.querySelectorAll('[lang]'));
      const languageChanges = elementsWithLang.map(el => ({
        tag: el.tagName.toLowerCase(),
        lang: el.getAttribute('lang'),
        text: el.textContent.substring(0, 50)
      }));

      return {
        pageLang: lang,
        hasLang: !!lang,
        languageChanges,
        issues
      };
    });

    return languageData;
  }

  // 9. LANDMARKS ANALYSIS
  async analyzeLandmarks() {
    const landmarkData = await this.page.evaluate(() => {
      function getXPath(element) {
        if (element.id && document.querySelectorAll('#' + CSS.escape(element.id)).length === 1) {
          // Unique ID: Use the shortest possible XPath
          return '//*[@id="' + element.id + '"]';
        }
        if (element === document.documentElement) {
          return '/html';
        }
        if (element === document.body) {
          return '/html/body';
        }
        let ix = 1;
        let siblings = element.parentNode ? element.parentNode.children : [];
        for (let i = 0; i < siblings.length; i++) {
          let sibling = siblings[i];
          if (sibling === element) {
            let parentXPath = getXPath(element.parentNode);
            let tagName = element.tagName.toLowerCase();
            return parentXPath + '/' + tagName + '[' + ix + ']';
          }
          if (sibling.tagName === element.tagName) {
            ix++;
          }
        }
      }
      const landmarks = {
        header: document.querySelectorAll('header, [role="banner"]').length,
        nav: document.querySelectorAll('nav, [role="navigation"]').length,
        main: document.querySelectorAll('main, [role="main"]').length,
        aside: document.querySelectorAll('aside, [role="complementary"]').length,
        footer: document.querySelectorAll('footer, [role="contentinfo"]').length,
        section: document.querySelectorAll('section, [role="region"]').length,
        article: document.querySelectorAll('article').length
      };

      const issues = [];


      // Check for main landmark
      if (landmarks.main === 0) {
        issues.push({
          type: 'error',
          message: 'No main landmark found',
          impact: 'serious',
          category: 'landmarks'
        });
      } else if (landmarks.main > 1) {
        issues.push({
          type: 'warning',
          message: `Multiple main landmarks found (${landmarks.main})`,
          impact: 'moderate',
          category: 'landmarks'
        });
      }

      // Check for header
      if (landmarks.header === 0) {
        issues.push({
          type: 'warning',
          message: 'No header landmark found',
          impact: 'moderate',
          category: 'landmarks'
        });
      }

      // Check for navigation
      if (landmarks.nav === 0) {
        issues.push({
          type: 'warning',
          message: 'No navigation landmark found',
          impact: 'moderate',
          category: 'landmarks'
        });
      }

      // Check for footer
      if (landmarks.footer === 0) {
        issues.push({
          type: 'warning',
          message: 'No footer landmark found',
          impact: 'minor'
        });
      }

      // Check sections without accessible names
      const sections = Array.from(document.querySelectorAll('section'));
      sections.forEach((section, index) => {
        const hasAriaLabel = section.hasAttribute('aria-label');
        const hasAriaLabelledby = section.hasAttribute('aria-labelledby');

        if (!hasAriaLabel && !hasAriaLabelledby) {
          issues.push({
            type: 'warning',
            element: getXPath(section),
            text: section.text,
            message: `Section ${index + 1} without accessible name`,
            impact: 'minor',
            category: 'landmarks'
          });
        }
      });

      return {
        landmarks,
        issues
      };
    });

    return landmarkData;
  }

  // 10. META INFORMATION ANALYSIS
  async analyzeMetaInfo() {
    const metaData = await this.page.evaluate(() => {
      const title = document.title;
      const metaViewport = document.querySelector('meta[name="viewport"]');
      const metaDescription = document.querySelector('meta[name="description"]');

      const issues = [];

      if (!title || title.trim() === '') {
        issues.push({
          type: 'error',
          message: 'Page title is missing or empty',
          impact: 'serious',
          category: 'meta'
        });
      }

      if (!metaViewport) {
        issues.push({
          type: 'warning',
          message: 'Viewport meta tag is missing',
          impact: 'serious',
          category: 'meta'
        });
      } else {
        const content = metaViewport.getAttribute('content') || '';
        if (!content.includes('width=device-width')) {
          issues.push({
            type: 'warning',
            message: 'Viewport meta tag may not be properly configured for responsive design',
            impact: 'moderate',
            category: 'meta'
          });
        }

        if (content.includes('maximum-scale=1') || content.includes('user-scalable=no')) {
          issues.push({
            type: 'error',
            message: 'Viewport meta tag prevents user zooming',
            impact: 'critical',
            category: 'meta'
          });
        }
      }

      return {
        title: title || '',
        hasViewport: !!metaViewport,
        hasDescription: !!metaDescription,
        issues
      };
    });

    // Now test responsiveness by resizing viewport
    const viewports = [
      { width: 1920, height: 1080, label: 'desktop' },
      { width: 1024, height: 768, label: 'tablet' },
      { width: 768, height: 1024, label: 'small-tablet' },
      { width: 375, height: 667, label: 'mobile' }
    ];

    const responsiveIssues = [];

    for (const vp of viewports) {
      await this.page.setViewport({ width: vp.width, height: vp.height });
      await this.page.waitForTimeout(800); // allow layout to adjust

      // Check for horizontal scrolling
      const hasHorizontalScroll = await this.page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });

      if (hasHorizontalScroll) {
        responsiveIssues.push({
          type: 'error',
          message: `Horizontal scrolling detected at ${vp.label} (${vp.width}px)`,
          impact: 'serious',
          category: 'meta'
        });
      }

      // Check if content disappears (page too empty at that size)
      const contentHeight = await this.page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = vp.height;

      if (contentHeight < viewportHeight * 0.5) {
        responsiveIssues.push({
          type: 'warning',
          message: `Content may not adapt well at ${vp.label} (${vp.width}px)`,
          impact: 'moderate',
          category: 'meta'
        });
      }
    }

    return {
      meta: metaData,
      testedViewports: viewports.map(v => v.label),
      issues: [...metaData.issues, ...responsiveIssues]
    };
  }

  // Helper: Calculate contrast ratio
  // Helper: Calculate contrast ratio
  calculateContrastRatio(fg, bg) {
    const fgNorm = this.normalizeColor(fg);
    const bgNorm = this.normalizeColor(bg);

    const fgRgb = this.rgbStringToArray(fgNorm);
    const bgRgb = this.rgbStringToArray(bgNorm);

    const L1 = this.luminance(fgRgb);
    const L2 = this.luminance(bgRgb);

    const lighter = Math.max(L1, L2);
    const darker = Math.min(L1, L2);

    return (lighter + 0.05) / (darker + 0.05);
  }
  // Parse CSS color string into {r,g,b}
  normalizeColor(color) {
    // Dummy canvas for normalization
    const canvas = createCanvas(1, 1);
    const ctx = canvas.getContext('2d');

    try {
      ctx.fillStyle = '#000'; // reset
      ctx.fillStyle = color;  // normalize any CSS color (oklch, lab, hsl, hex, etc.)
      return ctx.fillStyle;   // always returns a valid normalized CSS color
    } catch (e) {
      throw new Error(`Unsupported color: ${color}`);
    }
  }

  rgbStringToArray(color) {
    // ✅ Already normalized
    // Handles `rgb(...)`, `rgba(...)`, and hex like `#fff` or `#ffffff`
    if (color.startsWith('#')) {
      let r, g, b;
      if (color.length === 4) {
        // shorthand #rgb
        r = parseInt(color[1] + color[1], 16);
        g = parseInt(color[2] + color[2], 16);
        b = parseInt(color[3] + color[3], 16);
      } else if (color.length === 7) {
        // full #rrggbb
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
      } else {
        throw new Error(`Unsupported hex: ${color}`);
      }
      return [r, g, b];
    }

    // ✅ rgb() or rgba()
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (match) {
      return [
        parseInt(match[1]),
        parseInt(match[2]),
        parseInt(match[3])
      ];
    }

    throw new Error(`Could not parse: ${color}`);
  }

  luminance([r, g, b]) {
    const srgb = [r, g, b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
  }

  // Calculate overall score
  calculateScore(results) {
    let score = 100;
    let totalWeighted = 0;
    let totalPossible = 0;

    const impactWeights = {
      critical: 4,
      serious: 3,
      moderate: 2,
      minor: 1
    };

    const customChecks = [
      results.imageAnalysis,
      results.headingAnalysis,
      results.colorContrastAnalysis,
      results.keyboardNavAnalysis,
      results.ariaAnalysis,
      results.formAnalysis,
      results.languageAnalysis,
      results.landmarkAnalysis
    ];

    let totalElements = 0;
    customChecks.forEach((check) => {
      totalElements += check.total || 0;
      totalElements += check.totalCount || 0;
      totalElements += check.totalElements || 0;
      totalElements += check.totalFocusable || 0;
      totalElements += check.totalAriaElements || 0;
      totalElements += check.totalInputs || 0;
      totalElements += check.totalForms || 0;
      totalElements += check.languageChanges ? check.languageChanges.length : 0;
      totalElements += Object.values(check.landmarks || {}).reduce((a, b) => a + b, 0);
      if (check && check.issues) {
        check.issues.forEach(issue => {
          const weight = impactWeights[issue.impact] || 1;
          totalWeighted += weight;
        });
      }
    });

    // Maximum possible deduction if all issues were critical
    totalPossible = totalElements * impactWeights.critical;

    // If no issues, score is 100
    if (totalPossible === 0) return 100;

    // Relative deduction
    const deduction = (totalWeighted / totalPossible) * 100;
    // return totalElements;
    return Math.max(0, Math.round(score - deduction));
  }

  async generateSummary(results) {
    const summary = {
      totalIssues: 0,
      criticalIssues: 0,
      seriousIssues: 0,
      moderateIssues: 0,
      minorIssues: 0,
      topIssues: []
    };

    const allIssues = [];

    // 2️⃣ Add custom issues from all checks
    const customChecks = [
      results.imageAnalysis,
      results.headingAnalysis,
      results.colorContrastAnalysis,
      results.keyboardNavAnalysis,
      results.ariaAnalysis,
      results.formAnalysis,
      results.languageAnalysis,
      results.landmarkAnalysis
    ];

    customChecks.forEach(check => {
      if (check?.issues?.length > 0) {
        check.issues.forEach(issue => {
          summary.totalIssues++;

          switch (issue.impact) {
            case 'critical': summary.criticalIssues++; break;
            case 'serious': summary.seriousIssues++; break;
            case 'moderate': summary.moderateIssues++; break;
            case 'minor': summary.minorIssues++; break;
          }

          allIssues.push({
            type: 'custom',
            category: issue.category || 'general',
            message: issue.message,
            impact: issue.impact,
            element: issue.element || null
          });
        });
      }
    });

    // 3️⃣ Rank issues by severity
    const impactRank = { critical: 1, serious: 2, moderate: 3, minor: 4 };

    const topTen = allIssues
      .sort((a, b) => (impactRank[a.impact] || 99) - (impactRank[b.impact] || 99))
      .slice(0, 10);

    // 4️⃣ Group the top 10 issues by category
    const groupedByCategory = {};

    topTen.forEach(issue => {
      const cat = issue.category || 'uncategorized';
      if (!groupedByCategory[cat]) {
        groupedByCategory[cat] = {
          category: cat,
          impact: issue.impact,
          issues: [],
          count: 0
        };
      }

      groupedByCategory[cat].issues.push(issue);
      groupedByCategory[cat].count += 1;
    });

    // 5️⃣ Convert to sorted array (highest severity first)
    const groupedArray = Object.values(groupedByCategory)
      .sort((a, b) => (impactRank[a.impact] || 99) - (impactRank[b.impact] || 99));

    summary.topIssues = groupedArray;

    // 6️⃣ Capture a screenshot per grouped category
    for (let i = 0; i < summary.topIssues.length; i++) {
      const group = summary.topIssues[i];
      const issuesForScreenshot = group.issues
        .filter(item => item.element)
        .map((issue, idx) => ({
          type: issue.impact === 'critical' || issue.impact === 'serious' ? 'error' : 'warning',
          element: issue.element,
          message: issue.message || issue.description || `Issue ${idx + 1}`
        }));

      if (issuesForScreenshot.length > 0) {
        const safeName = group.category.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50);

        try {
          const screenshotPath = await this.captureIssuesScreenshot(
            issuesForScreenshot,
            `grouped-${safeName}`
          );
          group.screenshot = screenshotPath;

        } catch (err) {
          console.warn(`Failed to capture screenshot for ${group.category}:`, err.message);
        }
      }
    }

    return summary;
  }

};

module.exports = AccessibilityAnalyzer;