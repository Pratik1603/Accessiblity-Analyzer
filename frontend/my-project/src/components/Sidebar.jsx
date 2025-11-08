import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearAuthToken } from '../redux/slices/authSlice';
import { useDispatch } from 'react-redux';

export default function Sidebar() {
  const { token, user } = useSelector((state) => state.auth);
  const { reports } = useSelector((state) => state.report);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [showReports, setShowReports] = useState(false);

  const LogOutFun = () => {
    localStorage.removeItem("auth_token");
    navigate('/');
    dispatch(clearAuthToken());
  };

  const toggleReports = () => {
    setShowReports((prev) => !prev);
  };

  const goToReport = (id) => {
    navigate(`/report/${id}`);
    setShowReports(false);
  };

  return (
    <aside className="w-72 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl flex flex-col justify-between py-8 px-6 h-lvh relative">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
      
      <div>
        {/* Profile Section */}
        <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-700">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full w-14 h-14 flex items-center justify-center text-white text-2xl font-bold shadow-lg ring-4 ring-indigo-500/20">
            {user?.email?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <div className="font-bold text-white text-lg">Welcome Back</div>
            <div className="text-sm text-slate-400 font-medium">{user?.email}</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex flex-col gap-2">
          {/* Dashboard Button - Active State */}
          <button className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold shadow-lg hover:shadow-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 hover:-translate-y-0.5">
            <span className="text-lg">📊</span>
            <span>Dashboard</span>
          </button>

          {/* Home Button */}
          <button
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white hover:bg-slate-700/60 font-semibold transition-all duration-300 hover:translate-x-1"
            onClick={() => navigate('/')}
          >
            <span className="text-lg">🏠</span>
            <span>Home</span>
          </button>

          {/* Analysed Pages Button with Badge */}
          <button
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl text-white hover:bg-slate-700/60 font-semibold transition-all duration-300 hover:translate-x-1"
            onClick={toggleReports}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">📄</span>
              <span>Analysed Pages</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-red-500 rounded-full px-2.5 py-1 text-xs font-bold shadow-md">
                {reports.length}
              </span>
              <span className={`text-slate-400 transition-transform duration-300 ${showReports ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </div>
          </button>

          {/* Reports Dropdown */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showReports ? 'max-h-36 opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="mt-2 bg-slate-800/50 rounded-xl p-2 max-h-64 overflow-y-auto scrollbar-custom">
              {reports.length === 0 ? (
                <div className="px-4 py-3 text-slate-400 text-sm text-center italic">
                  No reports available
                </div>
              ) : (
                <ul className="space-y-1">
                  {reports.map((r) => {
                    const getShortUrl = (url) => {
                      const stripped = url
                        .replace(/^https?:\/\//, '')
                        .replace(/^www\./, '')
                        .replace(/\.com$/, '');
                      return stripped.length > 15 ? stripped.slice(0, 12) + '...' : stripped;
                    };

                    return (
                      <li
                        key={r.id}
                        className="cursor-pointer px-4 py-2.5 text-white hover:bg-indigo-600/40 rounded-lg transition-all duration-200 hover:translate-x-1"
                        onClick={() => goToReport(r.id)}
                      >
                        <div className="flex justify-between items-center gap-3">
                          <span className="text-sm font-semibold text-indigo-400">
                            #{r.id.slice(-3)}
                          </span>
                          <span className="text-sm text-slate-300 flex-1 text-right truncate">
                            {getShortUrl(r.url)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* LogOut Button */}
          <button
            onClick={LogOutFun}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-white bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 hover:border-red-500/50 font-bold transition-all duration-300 hover:translate-x-1 mt-4"
          >
            <span className="text-lg">🚪</span>
            <span>LogOut</span>
          </button>
        </nav>
      </div>

     
      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .scrollbar-custom::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-custom::-webkit-scrollbar-track {
          background: rgba(51, 65, 85, 0.3);
          border-radius: 10px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
          border-radius: 10px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.7);
        }
      `}</style>
    </aside>
  );
}