import React, { useState,useEffect } from "react";
import ResolveButton from "./ResolveButton";
import ResolvePage from "./ResolvePage";
// ✅ Section Card Component
function SectionCard({ title, issues = [], screenshot, info, setShowResolve, setIssue, setScShot }) {
  const totalIssues = (issues?.length ?? 0);

  const hasIssues = totalIssues > 0;
  return (
  
    <section className="relative group bg-white rounded-2xl shadow-md p-6 overflow-hidden transition-all duration-300">
    {/* Content wrapper (blur only if issues exist) */}
    <div
      className={`transition-all duration-300 ${
        hasIssues ? "group-hover:blur-[2px] group-hover:opacity-70 "  : ""
      }`}
    >
      <h2 className="text-lg font-bold text-blue-600 mb-2">{title}</h2>

      {hasIssues ? (
        <>
          <p className="mb-2 font-medium text-gray-700">
            Total Issues Found:{" "}
            <span className="font-bold text-red-600">{totalIssues}</span>
          </p>
          {info}
        </>
      ) : (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded px-3 py-2 font-medium">
          <span className="text-xl">✅</span> This section is accessible
        </div>
      )}
    </div>

      {/* Hover "Resolve" button */}
      {totalIssues > 0 && (
        <ResolveButton onClick={() => {setShowResolve(true); setIssue(issues);setScShot(screenshot);}} />
      )}
    </section>
  );
}



// ✅ Main Grid
export default function DetailsGrid({ custom , scShotts}) {
  const [showResolve, setShowResolve] = useState(false);
  const [activeSection, setActiveSection] = useState(null);
  const [scShot,setScShot] = useState();
  const [issue,setIssue] = useState();

  const openResolve = (section) => {
    setActiveSection(section);
    setShowResolve(true);
  };
  useEffect(() => {
    console.log("DetailsGrid received scShotts:", scShotts);
  }, [scShotts]);
  const mapScreenshotsToSections = (screenshots) => {
  const sectionMap = {
    images: null,
    headings: null,
    colorContrast: null,
    keyboardNavigation: null,
    aria: null,
    forms: null,
    language: null,
    meta: null,
    landmarks: null,
  };

  screenshots?.forEach((shot) => {
    const name = shot.filename?.toLowerCase() || ""; // normalize

    if (name.includes("aria")) sectionMap.aria = shot.url;
    else if (name.includes("images") || name.includes("screenshot")) sectionMap.images = shot.url;
    else if (name.includes("heading")) sectionMap.headings = shot.url;
    else if (name.includes("color")) sectionMap.colorContrast = shot.url;
    else if (name.includes("keyboard")) sectionMap.keyboardNavigation = shot.url;
    else if (name.includes("form")) sectionMap.forms = shot.url;
    else if (name.includes("language")) sectionMap.language = shot.url;
    else if (name.includes("meta")) sectionMap.meta = shot.url;
    else if (name.includes("landmark")) sectionMap.landmarks = shot.url;
  });

  return sectionMap;
};
const screenshotUrlsBySection = mapScreenshotsToSections(scShotts);

console.log(`Screenshot URLs by Section:`, screenshotUrlsBySection);
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Images Section */}
        <SectionCard
          title="Images"
          issues={custom.images?.issues}
          
          screenshot={screenshotUrlsBySection.images}
          info={
            <p>
              Total: {custom.images?.total ?? 0}, With Alt:{" "}
              {custom.images?.withAlt ?? 0}, Decorative:{" "}
              {custom.images?.decorative ?? 0}
            </p>
          }
          setShowResolve={setShowResolve}
          setIssue={setIssue}
          setScShot={setScShot}
        />

        {/* Headings Section */}
        <SectionCard
          title="Headings"
          issues={custom.headings?.issues}
          screenshot={screenshotUrlsBySection.headings}
          info={
            <p>
              Total Heading Elements: {custom.headings?.totalCount ?? 0}, 
              
            </p>
          }
          setShowResolve={setShowResolve}
           setIssue={setIssue}
          setScShot={setScShot}
        />

        {/* Color Contrast Section */}
        <SectionCard
          title="Color Contrast"
          issues={custom.colorContrast?.issues}
          screenshot={screenshotUrlsBySection.colorContrast}
          info={
            <p>
              Total Elements Checked:{" "}
              {custom.colorContrast?.totalElements ?? 0}
            </p>
          }
          setShowResolve={setShowResolve}
           setIssue={setIssue}
          setScShot={setScShot}
        />

        {/* Keyboard Navigation Section */}
        <SectionCard
          title="Keyboard Navigation"
          issues={custom.keyboardNavigation?.issues}
          screenshot={screenshotUrlsBySection.keyboardNavigation}
          info={
            <p>
              Total Focusable: {custom.keyboardNavigation?.totalFocusable ?? 0}
            </p>
          }
          setShowResolve={setShowResolve}
           setIssue={setIssue}
          setScShot={setScShot}
        />

        {/* ARIA Section */}
        <SectionCard
          title="ARIA"
          issues={custom.aria?.issues}
          screenshot={screenshotUrlsBySection.aria}
          info={
            <p>Total ARIA Elements: {custom.aria?.totalAriaElements ?? 0}</p>
          }
          setShowResolve={setShowResolve}
           setIssue={setIssue}
          setScShot={setScShot}
        />

        {/* Forms Section */}
        <SectionCard
          title="Forms"
          issues={custom.forms?.issues}
          screenshot={screenshotUrlsBySection.forms}
          info={
            <p>
              Total Forms: {custom.forms?.totalForms ?? 0}, Total Inputs:{" "}
              {custom.forms?.totalInputs ?? 0}
            </p>
          }
          setShowResolve={setShowResolve}
           setIssue={setIssue}
          setScShot={setScShot}
        />
        <div className="justify-evenly flex flex-col">
           {/* Language Section */}
        <SectionCard
          title="Language"
          issues={custom.language?.issues}
          screenshot={screenshotUrlsBySection.language}
          info={<p>Page Language: {custom.language?.pageLang ?? "unknown"}</p>}
          setShowResolve={setShowResolve}
           setIssue={setIssue}
          setScShot={setScShot}
        />

  {/* Meta Section */}
  <SectionCard
          title="Meta"
          issues={custom.meta?.issues}
          screenshot={screenshotUrlsBySection.meta}
          info={
            <p>
              Title: {custom.meta?.meta?.title ?? "N/A"}, Viewport:{" "}
              {custom.meta?.meta?.hasViewport ? "Yes" : "No"}, Description:{" "}
              {custom.meta?.meta?.hasDescription ? "Yes" : "No"}
            </p>
          }
          setShowResolve={setShowResolve}
           setIssue={setIssue}
          setScShot={setScShot}
        />


        </div>
       

        {/* Landmarks Section */}
        <SectionCard
          title="Landmarks"
          issues={custom.landmarks?.issues}
          screenshot={screenshotUrlsBySection.landmarks}
          info={
            <div className="grid grid-cols-2 gap-4">
              {["header", "nav", "main", "footer"].map((type) => {
                const count = custom.landmarks?.landmarks?.[type] ?? 0;
                const label = type.charAt(0).toUpperCase() + type.slice(1);
                const color =
                  count > 0
                    ? "bg-green-100 text-green-700 border-green-400"
                    : "bg-red-100 text-red-700 border-red-400";
                return (
                  <div
                    key={type}
                    className={`flex flex-col items-center border-l-4 ${color} rounded-xl p-3 min-w-[90px]`}
                  >
                    <span className="font-bold text-base">{label}</span>
                    <span className="text-2xl font-bold mt-1">{count}</span>
                    <span
                      className={`mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
                        count > 0
                          ? "bg-green-200 text-green-800"
                          : "bg-red-200 text-red-800"
                      }`}
                    >
                      {count > 0 ? "Present" : "Missing"}
                    </span>
                  </div>
                );
              })}
            </div>
          }
          setShowResolve={setShowResolve}
           setIssue={setIssue}
          setScShot={setScShot}
        />

        
      </div>

      {/* ✅ Resolve Panel */}
      {showResolve && (
          <ResolvePage showResolve={showResolve} setShowResolve={setShowResolve} issue={issue} scShot={scShot} />
 
      )}
    </>
  );
}
