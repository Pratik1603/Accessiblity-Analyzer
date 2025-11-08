import { Routes, Route, useNavigate } from 'react-router-dom';
import React, { useState, useRef, useEffect } from 'react';
import Report from './Report';
import { useSelector, useDispatch } from "react-redux";
import { setAuthToken, clearAuthToken } from './redux/slices/authSlice';
import { setReport, clearReport, setUserReports, clearUserReports } from "./redux/slices/reportSlice";

function App() {
  const [url, setUrl] = useState('');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const { reports } = useSelector((state) => state.report);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submittedUrl, setSubmittedUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaderMsgIdx, setLoaderMsgIdx] = useState(0);
  const loaderInterval = useRef(null);
  const pollRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { summary } = useSelector((state) => state.report);
  const { token, isAuthenticated, user } = useSelector((state) => state.auth);

  const loaderMessages = [
    'Checking color contrast...',
    'Scanning for alt text on images...',
    'Analyzing keyboard navigation...',
    'Detecting ARIA roles...',
    'Reviewing heading structure...',
    'Testing form labels...',
    'Evaluating link accessibility...',
    'Finalizing report...'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      openAuth('login');
      return;
    }

    setLoading(true);
    setLoaderMsgIdx(0);
    setSubmittedUrl('');

    loaderInterval.current = setInterval(() => {
      setLoaderMsgIdx((idx) => (idx + 1) % loaderMessages.length);
    }, 1200);

    try {
      const res = await fetch('http://localhost:3000/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Scan failed');

      if (body && body.id) {
        const reportId = body.id;
        const initialStatus = body.status || body.state || (body.report_json ? 'ready' : undefined);

        if (initialStatus && initialStatus.toString().toLowerCase() !== 'queued' && initialStatus.toString().toLowerCase() !== 'pending') {
          clearInterval(loaderInterval.current);
          loaderInterval.current = null;
          setLoading(false);
          setSubmittedUrl(url);
          navigate(`/report/${reportId}`);
        } else {
          pollRef.current = setInterval(async () => {
            try {
              const r = await fetch(`http://localhost:3000/api/reports/${reportId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });

              if (!r.ok) {
                clearInterval(pollRef.current);
                pollRef.current = null;
                if (loaderInterval.current) clearInterval(loaderInterval.current);
                loaderInterval.current = null;
                setLoading(false);
                alert('The accessibility analysis failed. Please try again later.');
                return;
              }
              const jb = await r.json();

              if ((jb.report.summary.totalIssues > 0 && jb.screenshots.length > 0) || (jb.report.summary.totalIssues == 0)) {
                dispatch(
                  setReport({
                    score: jb.report.score,
                    summary: jb.report.summary,
                    customChecks: jb.report.customChecks,
                    scShot: jb.screenshots,
                  })
                );
                clearInterval(pollRef.current);
                pollRef.current = null;
                if (loaderInterval.current) clearInterval(loaderInterval.current);
                loaderInterval.current = null;
                setLoading(false);
                setSubmittedUrl(url);
                navigate(`/report/${reportId}`);
              }
            } catch (err) {
              console.log(err);
            }
          }, 3000);
        }
      }
    } catch (err) {
      alert(err.message || 'Scan error');
      if (loaderInterval.current) clearInterval(loaderInterval.current);
    }
  };

  const openAuth = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const logout = () => {
    localStorage.removeItem('aa_token');
    dispatch(clearReport());
    dispatch(clearAuthToken());
  };

  useEffect(() => {
    if (!token) {
      dispatch(clearUserReports());
      return;
    }

    const fetchReports = async () => {
      try {
        const res = await fetch('http://localhost:3000/api/reports', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error('Failed to fetch reports');

        const data = await res.json();
        dispatch(setUserReports(data));
      } catch (err) {
        console.error('Error fetching user reports:', err);
        dispatch(clearUserReports());
      }
    };

    fetchReports();
  }, [token, summary]);

  const submitAuth = async (e) => {
    e.preventDefault();
    try {
      const url = authMode === 'login' ? 'http://localhost:3000/api/auth/login' : 'http://localhost:3000/api/auth/register';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const body = await res.json();

      if (!res.ok) throw new Error(body.message || 'Auth failed');
      localStorage.setItem('auth_token', body.token);
      dispatch(setAuthToken({ token: body.token, email: body.email }));
      setShowAuthModal(false);
      setEmail('');
      setPassword('');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-purple-600">
              <style>{`
                @keyframes fadeInUp {
                  from {
                    opacity: 0;
                    transform: translateY(30px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                @keyframes fadeInRight {
                  from {
                    opacity: 0;
                    transform: translateX(30px);
                  }
                  to {
                    opacity: 1;
                    transform: translateX(0);
                  }
                }
                @keyframes float {
                  0%, 100% {
                    transform: translateY(0px);
                  }
                  50% {
                    transform: translateY(-20px);
                  }
                }
                @keyframes spin {
                  to {
                    transform: rotate(360deg);
                  }
                }
                @keyframes pulse-glow {
                  0%, 100% {
                    opacity: 1;
                  }
                  50% {
                    opacity: 0.5;
                  }
                }
                .animate-fade-in-up {
                  animation: fadeInUp 0.8s ease;
                }
                .animate-fade-in-right {
                  animation: fadeInRight 0.8s ease;
                }
                .animate-float {
                  animation: float 3s ease-in-out infinite;
                }
                .animate-spin-slow {
                  animation: spin 3s linear infinite;
                }
                .backdrop-blur-glass {
                  backdrop-filter: blur(10px);
                  -webkit-backdrop-filter: blur(10px);
                }
              `}</style>

              {/* Navbar */}
              <nav className="flex justify-between items-center px-6 py-6">
                <div className="text-white text-2xl font-bold tracking-tight">
                  ♿ AccessAnalyser
                </div>
                <div className="flex gap-3">
                  {!token ? (
                    <>
                      <button
                        onClick={() => openAuth('login')}
                        className="px-6 py-3 rounded-xl bg-white/20 text-white font-semibold hover:bg-white/30 transition-all duration-300 backdrop-blur-glass hover:-translate-y-0.5"
                      >
                        Login
                      </button>
                      <button
                        onClick={() => openAuth('register')}
                        className="px-6 py-3 rounded-xl bg-white text-indigo-600 font-semibold hover:bg-gray-100 transition-all duration-300 hover:-translate-y-0.5 shadow-lg"
                      >
                        Register
                      </button>
                    </>
                  ) : (
                    <div
                      className="relative"
                      onMouseEnter={() => setShowProfileDropdown(true)}
                      onMouseLeave={() => setShowProfileDropdown(false)}
                    >
                      <div className="bg-white rounded-full w-12 h-12 flex items-center justify-center text-indigo-600 text-lg font-bold cursor-pointer shadow-lg hover:shadow-xl transition-all">
                        {user?.email?.charAt(0).toUpperCase()}
                      </div>

                      {showProfileDropdown && (
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl p-4 z-50 border border-gray-100">
                          <div className="mb-3 text-sm text-gray-700 font-semibold truncate pb-3 border-b border-gray-100">
                            {user?.email}
                          </div>
                          <button
                            className="block w-full text-left px-4 py-2.5 rounded-lg hover:bg-indigo-50 text-indigo-700 font-semibold mb-2 transition-all"
                            onClick={() => navigate(`/report/${reports[0]?.id}`)}
                          >
                            📊 Your Reports
                          </button>
                          <button
                            className="block w-full text-left px-4 py-2.5 rounded-lg hover:bg-red-50 text-red-600 font-semibold transition-all"
                            onClick={logout}
                          >
                            🚪 Logout
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </nav>

              {/* Hero Section */}
              <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  {/* Left Content */}
                  <div className="animate-fade-in-up text-white">
                    <div className="inline-block bg-white/20 backdrop-blur-glass px-5 py-2 rounded-full text-sm font-semibold mb-6">
                      ✨ WCAG 2.1 Compliant Analysis
                    </div>
                    <h1 className="text-5xl lg:text-6xl font-extrabold mb-6 leading-tight tracking-tight">
                      Accessibility Analyser
                    </h1>
                    <p className="text-xl mb-4 opacity-95 leading-relaxed">
                      Analyze your website for accessibility issues and improve user experience for everyone. Get instant insights and actionable recommendations.
                    </p>

                    {/* Input Form */}
                    <form onSubmit={handleSubmit} className="mt-8 mb-4">
                      <div className="bg-white/95 backdrop-blur-glass p-2 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-2">
                        <input
                          type="url"
                          placeholder="Enter website URL to check accessibility"
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          required
                          className="flex-1 px-6 py-4 rounded-xl border-0 outline-none text-gray-800 text-base bg-transparent"
                        />
                        <button
                          type="submit"
                          disabled={loading || !token}
                          className="px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 whitespace-nowrap"
                        >
                          {loading ? 'Analyzing...' : 'Analyze →'}
                        </button>
                      </div>
                    </form>

                    {!token && (
                      <p className="text-sm text-white/90 mb-6">
                        You must be logged in to run an analysis.{' '}
                        <button onClick={() => openAuth('login')} className="underline font-semibold">
                          Login
                        </button>{' '}
                        or{' '}
                        <button onClick={() => openAuth('register')} className="underline font-semibold">
                          Register
                        </button>
                      </p>
                    )}

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12">
                      <div className="bg-white/10 backdrop-blur-glass p-5 rounded-xl hover:bg-white/15 transition-all duration-300 hover:-translate-y-1">
                        <div className="text-3xl mb-2">🎯</div>
                        <h3 className="font-bold text-base mb-1">Quick Scan</h3>
                        <p className="text-sm opacity-90">Instant analysis in seconds</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-glass p-5 rounded-xl hover:bg-white/15 transition-all duration-300 hover:-translate-y-1">
                        <div className="text-3xl mb-2">📊</div>
                        <h3 className="font-bold text-base mb-1">Detailed Reports</h3>
                        <p className="text-sm opacity-90">Comprehensive insights</p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-glass p-5 rounded-xl hover:bg-white/15 transition-all duration-300 hover:-translate-y-1">
                        <div className="text-3xl mb-2">🔧</div>
                        <h3 className="font-bold text-base mb-1">Easy Fixes</h3>
                        <p className="text-sm opacity-90">Step-by-step guidance</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Illustration */}
                  <div className="animate-fade-in-right relative hidden lg:block">
                    <div className="relative">
                      <svg className="w-full drop-shadow-2xl" viewBox="0 0 600 500" fill="none">
                        <rect x="50" y="50" width="500" height="350" rx="20" fill="white" opacity="0.1"/>
                        <rect x="80" y="120" width="200" height="150" rx="10" fill="white" opacity="0.2"/>
                        <rect x="320" y="120" width="200" height="80" rx="10" fill="white" opacity="0.2"/>
                        <rect x="320" y="220" width="200" height="80" rx="10" fill="white" opacity="0.2"/>
                        <circle cx="480" cy="340" r="40" fill="#667eea"/>
                        <path d="M460 340 L475 355 L500 330" stroke="white" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>

                      {/* Floating Cards */}
                      <div className="absolute top-12 -right-4 bg-white p-5 rounded-2xl shadow-2xl w-52 animate-float">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl mb-3">
                          ✓
                        </div>
                        <div className="text-gray-900 font-bold text-sm mb-1">95% Accessible</div>
                        <div className="text-gray-600 text-xs">Meets most standards</div>
                      </div>

                      <div className="absolute bottom-16 -left-8 bg-white p-5 rounded-2xl shadow-2xl w-48 animate-float" style={{ animationDelay: '1s' }}>
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl mb-3">
                          ⚡
                        </div>
                        <div className="text-gray-900 font-bold text-sm mb-1">Fast Analysis</div>
                        <div className="text-gray-600 text-xs">Complete in 10 seconds</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loader Modal */}
              {loading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                  <div className="bg-white rounded-3xl p-10 shadow-2xl max-w-md w-full mx-4 animate-fade-in-up">
                    <div className="relative w-20 h-20 mx-auto mb-6">
                      <div className="absolute inset-0 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                      <div className="absolute inset-2 border-4 border-purple-300 border-t-transparent rounded-full animate-spin-slow"></div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-6 h-6 bg-indigo-600 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-gray-800 text-center mb-2 min-h-[3rem] flex items-center justify-center">
                      {loaderMessages[loaderMsgIdx]}
                    </div>
                    <div className="text-sm text-gray-500 text-center">
                      Analyzing <span className="font-semibold text-indigo-600">{url}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Auth Modal */}
              {showAuthModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                  <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl animate-fade-in-up">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">
                        {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                      </h3>
                      <button
                        onClick={() => setShowAuthModal(false)}
                        className="text-gray-400 hover:text-gray-600 text-2xl font-light leading-none"
                      >
                        ×
                      </button>
                    </div>
                    <form onSubmit={submitAuth} className="space-y-5">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                        <input
                          required
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          placeholder="your@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                        <input
                          required
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                          placeholder="••••••••"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                      >
                        {authMode === 'login' ? 'Login' : 'Create Account'}
                      </button>
                      <div className="text-center text-sm text-gray-600">
                        {authMode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
                        <button
                          type="button"
                          onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                          className="text-indigo-600 font-semibold hover:underline"
                        >
                          {authMode === 'login' ? 'Register' : 'Login'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          }
        />
        <Route path="/report/:id" element={<Report />} />
      </Routes>
    </>
  );
}

export default App;