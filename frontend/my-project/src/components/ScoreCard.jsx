import React from 'react';
import { Doughnut } from 'react-chartjs-2';

export default function ScoreCard({ score, scoreData }) {
  // Custom gradient-styled score data
  const customScoreData = {
    ...scoreData,
    datasets: [
      {
        ...scoreData.datasets[0],
        backgroundColor: [
          '#667eea', // Vibrant indigo/purple for the score
          '#e5e7eb', // Light gray for remainder
        ],
        borderWidth: 0,
      },
    ],
  };

  // Determine score label and color based on score value
  let scoreLabel = 'Excellent';
  let scoreLabelColor = 'text-green-600';
  let ringGlow = 'shadow-green-200';

  if (score >= 90) {
    scoreLabel = 'Excellent';
    scoreLabelColor = 'text-green-600';
    ringGlow = 'shadow-green-200';
  } else if (score >= 75) {
    scoreLabel = 'Good Score';
    scoreLabelColor = 'text-blue-600';
    ringGlow = 'shadow-blue-200';
  } else if (score >= 50) {
    scoreLabel = 'Fair Score';
    scoreLabelColor = 'text-yellow-600';
    ringGlow = 'shadow-yellow-200';
  } else {
    scoreLabel = 'Needs Work';
    scoreLabelColor = 'text-red-600';
    ringGlow = 'shadow-red-200';
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 p-6 flex flex-col items-center justify-center col-span-1 relative overflow-hidden">
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      
      <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
        Accessibility Score
      </h3>
      
      {/* Score Circle with Doughnut Chart */}
      <div className={`relative w-36 h-36 mb-4 flex items-center justify-center ${ringGlow} hover:shadow-2xl transition-shadow duration-300`}>
        <Doughnut 
          data={customScoreData} 
          options={{ 
            cutout: '75%', 
            plugins: { 
              legend: { display: false },
              tooltip: { enabled: false }
            },
            responsive: true,
            maintainAspectRatio: true
          }} 
        />
        {/* Score Number */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 select-none">
            {score}
          </span>
          <span className="text-sm font-semibold text-gray-500 mt-1">/ 100</span>
        </div>
      </div>
      
      {/* Score Label */}
      <div className={`text-base font-bold ${scoreLabelColor} text-center px-4 py-2 rounded-full bg-gradient-to-r from-gray-50 to-slate-100 border-2 border-gray-200`}>
        {scoreLabel}
      </div>

      {/* Progress Bar (optional decorative element) */}
      <div className="w-full mt-4 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${score}%` }}
        ></div>
      </div>
    </div>
  );
}