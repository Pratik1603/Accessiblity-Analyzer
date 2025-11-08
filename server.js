// load environment variables from .env (if present)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const AccessibilityAnalyzer = require('./accessiblityAnalyzer');
const db = require('./db_pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { producer } = require('./kafka.js');
const { consumer } = require('./kafka.js');

const PORT = process.env.PORT || 3000;
const REPORTS_DIR = path.resolve('./reports');
fs.mkdirSync(REPORTS_DIR, { recursive: true });

(async () => {
  try {
    await db.ensureSchema();
    console.log('DB schema ensured');
  } catch (e) {
    console.error('Failed to ensure DB schema:', e);
  }
})();

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Simple request logger to help debug routing and incoming requests
app.use((req, res, next) => {
  try {
    const ip = req.ip || req.connection && req.connection.remoteAddress || '-';
    console.log(`${new Date().toISOString()} ${ip} ${req.method} ${req.url}`);
  } catch (e) {}
  next();
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'missing auth' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'bad auth' });
  try {
    const payload = jwt.verify(parts[1], JWT_SECRET);
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'invalid token' });
  }
}

// Simple in-memory queue
const queue = [];
let working = false;

// function enqueue(job) {
//   queue.push(job);
//   processQueue();
// }

// async function processQueue() {
//   if (working) return;
//   const job = queue.shift();
//   if (!job) return;
//   working = true;
//   try {
//     console.log('Processing job', job.id, job.url);
//     const outDir = path.join(REPORTS_DIR, job.id);
//     fs.mkdirSync(outDir, { recursive: true });

//     const analyzer = new AccessibilityAnalyzer({
//       outputDir: outDir,
//       launchOptions: job.launchOptions || { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
//     });

//     const report = await analyzer.analyze(job.url);
    
//     // attach meta
  
//     const fullReport = {
//       id: job.id,
//       url: job.url,
//       timestamp: new Date().toISOString(),
//       report
//     };

//   // persist report JSON into DB
//   await db.updateReportJson(job.id, JSON.stringify(fullReport));

//     // find screenshots in outDir and store them into DB as blobs
//     try {
//       const files = fs.readdirSync(outDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
//       const screenshots = [];
//       for (const file of files) {
//         const fullPath = path.join(outDir, file);
//         const data = fs.readFileSync(fullPath);
//         const sid = uuidv4();
//         const mime = file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      
//         screenshots.push({ id: sid, reportId: job.id, filename: file, mime, data });
//         try { fs.unlinkSync(fullPath); } catch (e) {}
//       }
//       if (screenshots.length > 0) {
//         await db.saveScreenshotsBatch(screenshots);
//       }
//     }
//      catch (e) {
//       console.warn('No screenshots to save for', job.id);
//     }

//     console.log('Job completed', job.id);
  
//   } catch (err) {
//     console.error('Job failed', job.id, err.message);
//     await db.deleteReport(job.id);
//     const outDir = path.join(REPORTS_DIR, job.id);
//     try {
//       fs.writeFileSync(path.join(outDir, 'error.json'), JSON.stringify({ error: err.message }), 'utf-8');
//     } catch (e) {}
//   } finally {
//     working = false;
//     // Process next job
//     setImmediate(processQueue);
//   }
// }



async function enqueue(job) {
  await producer.connect();
  await producer.send({
    topic: 'jobs',
    messages: [
      { value: JSON.stringify(job) }
    ]
  });
  // You may choose to disconnect producer less frequently (e.g., app shutdown) for efficiency
}

async function runConsumer() {
  
  await consumer.connect();
  await consumer.subscribe({ topic: 'jobs', fromBeginning: false });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const job = JSON.parse(message.value.toString());
      console.log('Processing job', job.id, job.url);

      const outDir = path.join(REPORTS_DIR, job.id);
      fs.mkdirSync(outDir, { recursive: true });

      try {
        const analyzer = new AccessibilityAnalyzer({
          outputDir: outDir,
          launchOptions: job.launchOptions || { headless: false, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
        });

        const report = await analyzer.analyze(job.url);

        const fullReport = {
          id: job.id,
          url: job.url,
          timestamp: new Date().toISOString(),
          report
        };

        await db.updateReportJson(job.id, JSON.stringify(fullReport));

        // Save screenshots
        const files = fs.readdirSync(outDir).filter(f => /\.(png|jpg|jpeg)$/i.test(f));
        const screenshots = [];

        for (const file of files) {
          const fullPath = path.join(outDir, file);
          const data = fs.readFileSync(fullPath);
          const sid = uuidv4();
          const mime = file.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
          screenshots.push({ id: sid, reportId: job.id, filename: file, mime, data });
          try { fs.unlinkSync(fullPath); } catch (e) {}
        }

        if (screenshots.length > 0) {
          await db.saveScreenshotsBatch(screenshots);
        }

        console.log('Job completed', job.id);

      } catch (err) {
        console.error('Job failed', job.id, err.message);
        await db.deleteReport(job.id);
        try {
          fs.writeFileSync(path.join(outDir, 'error.json'), JSON.stringify({ error: err.message }), 'utf-8');
        } catch (e) {}
      }
    }
  });
}


// API: start a scan
// Auth: register
app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const existing = await db.getUserByEmail(email);
  if (existing) return res.status(409).json({ error: 'email taken' });
  const id = uuidv4();
  const hash = await bcrypt.hash(password, 10);
  await db.createUser(id, email, hash);
  const token = jwt.sign({ sub: id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, email });
});

// Auth: login
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const user = await db.getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'invalid' });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid' });
  const token = jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, email: user.email });
});

// API: start a scan (authenticated)
app.post('/api/scan', authMiddleware, async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Missing url in body' });
  }

  // Basic URL validation
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return res.status(400).json({ error: 'Only http(s) urls are allowed' });
    }
  } catch (e) {
    return res.status(400).json({ error: 'Invalid url' });
  }

  const id = uuidv4();
  const job = { id, url, userId: req.user.sub };
  // create report placeholder in DB
  try{
     await db.createReport(id, req.user.sub, url, null);
  enqueue(job);
  res.status(202).json({ id, status: 'queued' });
  }
  catch(err){
    console.error('Failed to create report record:', err);
    res.status(500).json({ id, status: 'failed' });
  }
 
});

// API: list reports
// List reports for authenticated user
app.get('/api/reports', authMiddleware, async (req, res) => {
  const items = await db.listReportsByUser(req.user.sub);
  res.json(items);
});

// API: get a specific report
// Get report by id (must belong to user)
app.get('/api/reports/:id', authMiddleware, async (req, res) => {
 
  const id = req.params.id;
  const report = await db.getReportById(id);
  // console.log(report);
  if (!report) return res.status(404).json({ error: 'not found' });
  if (report.user_id !== req.user.sub) return res.status(403).json({ error: 'forbidden' });
  if (report.report_json==null) return res.status(202).json({ id, status: 'pending' });
  
  try {
    
    const content = JSON.parse(report.report_json);
    
    const shots = await db.listScreenshots(id);
    console.log(shots);
    content.screenshots = shots;
    console.log(content);
    res.json(content);
  
  } catch (e) {
    res.status(500).json({ error: 'failed to read report' });
  }
});

// Serve screenshot blob by id (authenticated)
app.get('/api/screenshots/:id', authMiddleware, async (req, res) => {
  const id = req.params.id;
  const shot = await db.getScreenshotData(id);
  if (!shot) return res.status(404).json({ error: 'not found' });
  // ensure the report belongs to the user
  const report = await db.getReportById(shot.report_id);
  if (report && report.user_id !== req.user.sub) return res.status(403).json({ error: 'forbidden' });
  res.set('Content-Type', shot.mime);
  res.send(shot.data);
});

// Serve stored screenshots and files
app.use('/reports-files', express.static(REPORTS_DIR));

// Health endpoint: basic server + DB check
app.get('/health', async (req, res) => {
  const result = { ok: true, timestamp: new Date().toISOString() };
  try {
    // db.pool exists in db_pg
    if (db && db.pool) {
      const { rows } = await db.pool.query('SELECT 1 as ok');
      result.db = rows && rows.length ? true : false;
    } else {
      result.db = false;
    }
  } catch (e) {
    result.db = false;
    result.dbError = e && (e.message || e.toString());
  }
  res.json(result);
});

app.listen(PORT, async () => {
  try{
     await runConsumer();
  console.log(`Accessibility Analyzer server running on http://localhost:${PORT}`);
  }
 catch(err){
  console.error('Failed to start Kafka consumer:', err);
 }
});
