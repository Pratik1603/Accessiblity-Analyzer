import React from 'react';
import Sidebar from './components/Sidebar';
import ScoreCard from './components/ScoreCard';
import DetailsGrid from './components/DetailsGrid';
import ResolvePage from './components/ResolvePage';
import { useState, useEffect } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useDispatch } from 'react-redux';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);
import { setReport } from './redux/slices/reportSlice';

export default function Report() {
  const [showResolve, setShowResolve] = useState(false);
  const [issue, setIssue] = useState();
  const [screenshot, setScreenshot] = useState();
  const { score, summary, customChecks: custom, scShot } = useSelector((state) => state.report);
  const [scImage, setScImage] = useState([]);
  const { token, isAuthenticated } = useSelector((state) => state.auth);
  const { id } = useParams();
  const dispatch = useDispatch();
  
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/reports/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch report');

        const jb = await res.json();
        dispatch(setReport({
          score: jb.report.score,
          summary: jb.report.summary,
          customChecks: jb.report.customChecks,
          scShot: jb.screenshots,
        }));
      } catch (err) {
        console.log(err.message);
      }
    };
    fetchReport();
  }, [id, token]);
  
  const getScreenshotUrls = async (screenshots) => {
    const results = [];
    for (const shot of screenshots) {
      try {
        const res = await fetch(`http://localhost:3000/api/screenshots/${shot.id}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          results.push({ ...shot, url });
        }
      } catch (err) {
        console.error(`⚠️ Error fetching screenshot ${shot.id}:`, err);
      }
    }
    return results;  
  }

  useEffect(() => {
    let isActive = true;
    async function fetchScreenshots() {
      if (scShot && scShot.length > 0 && token) {
        const results = await getScreenshotUrls(scShot);
        if (isActive) setScImage(results);
      }
    }
    fetchScreenshots();
    return () => {
      setScImage(scrs =>
        (scrs || []).forEach(shot => URL.revokeObjectURL(shot.url))
      );
      isActive = false;
    };
  }, [scShot, token]);

  const scoreData = {
    labels: ['Score', 'Remaining'],
    datasets: [
      {
        data: [score, 100 - score],
        backgroundColor: ['#667eea', '#e5e7eb'],
        borderWidth: 0,
      },
    ],
  };

  const issueBarData = {
    labels: ['Critical', 'Serious', 'Moderate', 'Minor'],
    datasets: [
      {
        label: 'Issues',
        data: [
          summary.criticalIssues ?? 0,
          summary.seriousIssues ?? 0,
          summary.moderateIssues ?? 0,
          summary.minorIssues ?? 0,
        ],
        backgroundColor: [
          '#ef4444',
          '#f59e0b',
          '#eab308',
          '#22c55e',
        ],
        borderRadius: 10,
        barPercentage: 0.7,
      },
    ],
  };

  const screenReaderIssues = [
    ...(custom.images?.issues || []),
    ...(custom.aria?.issues || []),
  ];

  const mapScreenshotsToSections = (screenshots) => {
    const sectionMap = {
      grouped_aria: null,
      grouped_screenreader: null
    };
    screenshots?.forEach((shot) => {
      const name = shot.filename?.toLowerCase() || "";
      if (name.includes("grouped-aria")) sectionMap.grouped_aria = shot.url;
      if (name.includes("grouped-screenreader")) sectionMap.grouped_screenreader = shot.url;
    });
    return sectionMap;
  }

  const mapSc = mapScreenshotsToSections(scImage);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600 w-full">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Dashboard */}
      <main className="flex-1 flex flex-col gap-8 p-4 md:p-8 overflow-y-auto h-lvh ">
        {/* Top Row: Score, Issue Summary, Screen Reader */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Score Card */}
          <ScoreCard score={score} scoreData={scoreData} />
          
          {/* Issue Summary Card */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6 flex flex-col gap-4 col-span-1 md:col-span-2 relative overflow-hidden">
            {/* Gradient top border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <h3 className="font-bold text-gray-800 text-lg">Issues by Severity</h3>
            
            <div className="h-36 w-full flex items-center">
              <Bar
                data={issueBarData}
                options={{
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      padding: 12,
                      cornerRadius: 8,
                      titleFont: { size: 14, weight: 'bold' },
                      bodyFont: { size: 13 }
                    }
                  },
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      suggestedMax: Math.max(10, ...issueBarData.datasets[0].data) * 1.2,
                      ticks: {
                        stepSize: Math.max(1, Math.floor(Math.max(...issueBarData.datasets[0].data) / 5)),
                        color: '#64748b',
                        font: { size: 11, weight: '600' },
                      },
                      grid: { 
                        color: '#e5e7eb',
                        drawBorder: false
                      },
                    },
                    x: {
                      ticks: { 
                        color: '#475569', 
                        font: { size: 11, weight: '600' } 
                      },
                      grid: { display: false },
                    },
                  },
                  layout: { padding: { top: 10 } },
                }}
              />
            </div>
            
            <div className="flex gap-4 mt-2 justify-around border-t border-gray-100 pt-4">
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-extrabold text-red-500">{summary.criticalIssues ?? 0}</span>
                <span className="text-xs text-gray-600 font-semibold">Critical</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-extrabold text-orange-500">{summary.seriousIssues ?? 0}</span>
                <span className="text-xs text-gray-600 font-semibold">Serious</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-extrabold text-yellow-500">{summary.moderateIssues ?? 0}</span>
                <span className="text-xs text-gray-600 font-semibold">Moderate</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <span className="text-2xl font-extrabold text-green-500">{summary.minorIssues ?? 0}</span>
                <span className="text-xs text-gray-600 font-semibold">Minor</span>
              </div>
            </div>
          </div>
          
          {/* Screen Reader Compatible Card */}
          <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6 flex flex-col items-center justify-center col-span-1 relative overflow-hidden">
            {/* Gradient top border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-blue-500"></div>
            
            <h3 className="font-bold text-blue-600 text-lg mb-4 text-center">Screen Reader Compatible</h3>
            
            <div className="relative w-28 h-28 mb-3 flex items-center justify-center">
              <Doughnut
                data={{
                  labels: ['Compatible', 'Issues'],
                  datasets: [
                    {
                      data: [
                        custom.images?.total && custom.aria?.totalAriaElements
                          ? Math.round(100 - ((screenReaderIssues.length / (custom.images?.total + custom.aria?.totalAriaElements)) * 100))
                          : 100,
                        custom.images?.total && custom.aria?.totalAriaElements
                          ? Math.round((screenReaderIssues.length / (custom.images?.total + custom.aria?.totalAriaElements)) * 100)
                          : 0,
                      ],
                      backgroundColor: ['#22c55e', '#ef4444'],
                      borderWidth: 0,
                    },
                  ],
                }}
                options={{ 
                  cutout: '75%', 
                  plugins: { 
                    legend: { display: false },
                    tooltip: { enabled: false }
                  } 
                }}
              />
              <span className="absolute text-2xl font-extrabold text-blue-600 select-none">
                {custom.images?.total && custom.aria?.totalAriaElements
                  ? Math.round(100 - ((screenReaderIssues.length / (custom.images?.total + custom.aria?.totalAriaElements)) * 100))
                  : 100}%
              </span>
            </div>
            
            <div className="text-xs text-gray-500 mb-3 text-center font-medium">Screen reader compatibility</div>
            
            {screenReaderIssues.length > 0 ? (
              <button 
                onClick={() => { 
                  setShowResolve(true); 
                  setIssue(screenReaderIssues); 
                  setScreenshot(mapSc.grouped_screenreader || null) 
                }} 
                className="font-bold text-red-600 hover:text-red-700 text-sm text-center cursor-pointer transition-all hover:underline"
              >
                View Issues ({screenReaderIssues.length}) →
              </button>
            ) : (
              <div className="text-green-600 font-semibold text-sm bg-green-50 px-3 py-1 rounded-full">
                ✓ No issues found
              </div>
            )}
          </div>
        </div>

        {/* Top Issues by Category */}
        {summary.topIssues && summary.topIssues.length > 0 && (() => {
          const groupedIssues = summary.topIssues;

          return (
            <div className="bg-white  rounded-2xl shadow-lg p-6  w-full relative  ">
              {/* Gradient top border */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
              
              <h2 className="font-bold text-2xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Top Issues by Category
              </h2>

              <div className="flex gap-6 overflow-x-auto pb-4 hide-scrollbar ">
                {groupedIssues.map((group, idx) => {
                  const severity = group.severity;
                  let bgColor = 'bg-gradient-to-br from-red-50 to-red-100';
                  let textColor = 'text-red-700';
                  let borderColor = 'border-red-300';
                  let badgeBg = 'bg-red-100';
                  let badgeText = 'text-red-700';
                  let badgeBorder = 'border-red-300';
                  let icon = '🚨';
                  let severityLabel = 'Critical';
                  let hoverShadow = 'hover:shadow-red-200';

                  if (severity === 'serious') {
                    bgColor = 'bg-gradient-to-br from-orange-50 to-orange-100';
                    textColor = 'text-orange-700';
                    borderColor = 'border-orange-300';
                    badgeBg = 'bg-orange-100';
                    badgeText = 'text-orange-700';
                    badgeBorder = 'border-orange-300';
                    icon = '❗';
                    severityLabel = 'Serious';
                    hoverShadow = 'hover:shadow-orange-200';
                  } else if (severity === 'moderate') {
                    bgColor = 'bg-gradient-to-br from-yellow-50 to-yellow-100';
                    textColor = 'text-yellow-700';
                    borderColor = 'border-yellow-300';
                    badgeBg = 'bg-yellow-100';
                    badgeText = 'text-yellow-700';
                    badgeBorder = 'border-yellow-300';
                    icon = '⚠️';
                    severityLabel = 'Moderate';
                    hoverShadow = 'hover:shadow-yellow-200';
                  } else if (severity === 'minor') {
                    bgColor = 'bg-gradient-to-br from-green-50 to-green-100';
                    textColor = 'text-green-700';
                    borderColor = 'border-green-300';
                    badgeBg = 'bg-green-100';
                    badgeText = 'text-green-700';
                    badgeBorder = 'border-green-300';
                    icon = 'ℹ️';
                    severityLabel = 'Minor';
                    hoverShadow = 'hover:shadow-green-200';
                  }

                  return (
                    <div
                      key={idx}
                      className={`min-w-[280px] max-w-[280px] ${bgColor} rounded-2xl p-6 border-2 ${borderColor} ${hoverShadow} hover:shadow-xl transition-all duration-300 hover:-translate-y-2 flex flex-col justify-between cursor-pointer`}
                    >
                      <div className="flex items-start gap-3 mb-4">
                        <span className="text-3xl" aria-label="alert">{icon}</span>
                        <div className="flex-1">
                          <h3 className={`font-bold text-lg ${textColor} capitalize mb-2`}>
                            {group.category}
                          </h3>
                          <div className="flex gap-2 flex-wrap">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${badgeBg} ${badgeText} border-2 ${badgeBorder}`}>
                              {severityLabel}
                            </span>
                            {group.count > 1 && (
                              <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-700 text-xs font-bold border-2 border-slate-300">
                                x{group.count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={`text-sm ${textColor} mb-4 font-semibold`}>
                        Total issues: {group.count}
                      </div>

                      <button
                        onClick={() => {
                          setShowResolve(true);
                          setIssue(group.issues);
                          setScreenshot(mapSc.grouped_aria);
                        }}
                        className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5"
                      >
                        View Issues
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Details Grid */}
        {scImage && <DetailsGrid custom={custom} scShotts={scImage} />}
        
        {/* Resolve Page Modal */}
        {showResolve && (
          <ResolvePage 
            showResolve={showResolve} 
            setShowResolve={setShowResolve} 
            issue={issue} 
            scShot={screenshot} 
          />
        )}
        
        {/* Footer */}
        <footer className="text-center py-6 w-full mt-8">
          <p className="text-sm font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
            &copy; {new Date().getFullYear()} Accessibility Analyser. All rights reserved.
          </p>
        </footer>
      </main>
      
      <style>{`
        @keyframes slide-in-left {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.5s cubic-bezier(0.4,0,0.2,1) both;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}