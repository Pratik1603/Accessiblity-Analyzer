const ResolvePage = ({ showResolve, setShowResolve, issue, scShot }) => {
  console.log(issue);
  console.log(scShot);
  return (
    <div
      className="fixed inset-0 left-[16rem] z-50 flex items-center justify-center bg-white animate-slide-in-left"
      style={{ width: "calc(100% - 16rem)" }}
    >
      <div className="w-full h-full flex flex-col relative p-8">
        <button
          className="absolute top-6 right-8 text-2xl text-gray-400 hover:text-blue-600"
          onClick={() => setShowResolve(false)}
        >
          &times;
        </button>

        <div className="flex flex-1 gap-6">
          {/* Left Section */}
       <div className="border-2 border-gray-200 rounded-2xl w-3/5 bg-gray-50 shadow-inner p-4 flex items-center justify-center overflow-hidden">
    <div className="w-full max-h-[80vh] overflow-y-auto rounded-xl bg-white flex justify-center">
      <img
        src={scShot}
        alt="Resolve Illustration"
        className="w-full h-full rounded-xl shadow-md"
      />
    </div>
  </div>


          {/* Right Section */}
        <div className="border-2 border-gray-200 rounded-2xl w-2/5 h-full p-6 bg-white shadow-md flex flex-col">
  <h2 className="text-2xl font-semibold text-blue-700 mb-4">
    Detected Issues
  </h2>

  <div className="overflow-y-auto max-h-[75vh] space-y-4 pr-2">
    {(() => {
      // Normalize issue data:
      let issuesToShow = [];
      let fl=0;
      if (Array.isArray(issue)) {
        // case 1: issue is already an array of issues
        issuesToShow = issue;
      } else if (issue?.allIssues) {
        // case 2: grouped issue with allIssues[]
        issuesToShow = issue.allIssues;
      } else if (issue) {
        // case 3: single issue object
        fl=1;
        issuesToShow = [issue];
      }
   
      if(fl){
       
        return issuesToShow.length > 0 ? (
  issuesToShow.flatMap((item, idx) =>
    (item.elements || [item.element]).map((el, subIdx) => (
      <div
        key={`${idx}-${subIdx}`}
        className="border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 bg-gray-50"
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className={`px-3 py-1 text-xs font-semibold rounded-full ${
              (item.impact || item.severity) === "serious" ||
              (item.impact || item.severity) === "critical"
                ? "bg-red-100 text-red-600"
                : "bg-yellow-100 text-yellow-600"
            }`}
          >
            {item.impact || item.severity || "unknown"}
          </span>
          <span className="text-gray-400 text-sm">
            #{idx + 1}.{subIdx + 1}
          </span>
        </div>

        <p className="text-gray-800 font-medium mb-1">
          {item.message || "No message available"}
        </p>

        <p className="text-gray-500 text-sm break-all">
          <span className="font-semibold">Element:</span>{" "}
          {el || item.text || item.element || "Unknown"}
        </p>
      </div>
    ))
  )
) : (
  <p className="text-gray-500 text-center">No issues found 🎉</p>
);

      }
      else{
        
      return issuesToShow.length > 0 ? (
        issuesToShow.map((item, idx) => (
          <div
            key={idx}
            className="border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 bg-gray-50"
          >
            <div className="flex items-center justify-between mb-2">
              <span
                className={`px-3 py-1 text-xs font-semibold rounded-full ${
                  (item.impact || item.severity) === "serious"
                    ? "bg-red-100 text-red-600"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                {item.impact || item.severity || "unknown"}
              </span>
              <span className="text-gray-400 text-sm">#{idx + 1}</span>
            </div>
            <p className="text-gray-800 font-medium mb-1">
              {item.message || "No message available"}
            </p>
            <p className="text-gray-500 text-sm truncate">
              <span className="font-semibold">Element:</span>{" "}
              {item.text ||  item.element || "Unknown"}
            </p>
          </div>
        ))
      ) : (
        <p className="text-gray-500 text-center">No issues found 🎉</p>
      );
    }
    })()}
  </div>
</div>

        
        </div>
      </div>
    </div>
  );
};

export default ResolvePage;
