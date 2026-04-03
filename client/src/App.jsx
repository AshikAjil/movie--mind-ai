import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Clapperboard, User, Settings, LogOut, Database, Loader2, Heart, ThumbsDown, BarChart3 } from 'lucide-react';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Onboarding from './pages/Onboarding.jsx';
import MovieDetails from './pages/MovieDetails.jsx';
import Dashboard from './pages/Dashboard.jsx';
import BackgroundParticles from './components/BackgroundParticles.jsx';
import FilmstripBackground from './components/FilmstripBackground.jsx';

import { seedMovies, checkHealth, getUserInfo, seedMockUsers } from './services/api.js';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState('checking');
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);


  const navigate = useNavigate();
  const location = useLocation();

  // Initial Auth Check
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('movieai_token');
      if (token) {
        try {
          const userData = await getUserInfo();
          localStorage.removeItem('movieai_feed'); // Clear legacy feed caching on login
          setUser(userData);
        } catch {
          localStorage.removeItem('movieai_token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    fetchUser();
  }, []);

  // Check server health
  useEffect(() => {
    const ping = async () => {
      try {
        await checkHealth();
        setServerStatus('online');
      } catch {
        setServerStatus('offline');
      }
    };
    ping();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('movieai_token');
    setUser(null);
    setShowUserMenu(false);
    navigate('/login');
  };

  const handleSeedMovies = async () => {
    if (seeding) return;
    setSeeding(true);
    setSeedMsg('Seeding 500 movies (this may take a few minutes)...');
    try {
      const data = await seedMovies();
      setSeedMsg(`✅ ${data.message}`);
      setTimeout(() => setSeedMsg(''), 5000);
    } catch (err) {
      setSeedMsg(`❌ ${err.message}`);
      setTimeout(() => setSeedMsg(''), 8000);
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedUsers = async () => {
    try {
      setSeedMsg(`Seeding mock users...`);
      const data = await seedMockUsers();
      setSeedMsg(`✅ ${data.message}`);
      setTimeout(() => setSeedMsg(''), 3000);
    } catch(err) {
      setSeedMsg(`❌ ${err.message}`);
      setTimeout(() => setSeedMsg(''), 3000);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Loader2 size={40} className="spinner" />
      </div>
    );
  }

  const likedCount = user?.likedMovies?.length || 0;
  const dislikedCount = user?.dislikedMovies?.length || 0;

  const ProtectedRoute = ({ children }) => {
    if (!user) return <Navigate to="/login" />;
    if (!user.selectedMovies || user.selectedMovies.length === 0) {
      if (location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" />;
      }
    }
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <BackgroundParticles />
        <header className="header">
          <div className="container">
            <div className="header-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Clapperboard size={26} style={{ color: 'var(--accent-1)' }} />
                <span className="logo">MovieMind AI</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  title={serverStatus === 'online' ? 'Backend online' : 'Backend offline'}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.3rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                    background: serverStatus === 'online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: `1px solid ${serverStatus === 'online' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                    color: serverStatus === 'online' ? 'var(--success)' : 'var(--danger)',
                  }}
                >
                  <span
                    style={{
                      width: '6px', height: '6px', borderRadius: '50%',
                      background: serverStatus === 'online' ? 'var(--success)' : 'var(--danger)',
                      animation: serverStatus === 'online' ? 'pulse 2s infinite' : 'none',
                    }}
                  />
                  {serverStatus === 'checking' ? 'Connecting...' : serverStatus === 'online' ? 'Online' : 'Offline'}
                </div>

                <button 
                  className="btn-ghost" 
                  onClick={() => navigate('/dashboard')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <BarChart3 size={14} />
                  My Taste
                </button>



                <div style={{ position: 'relative' }}>
                  <button
                    className="btn-ghost"
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <User size={14} />
                    {user.name || 'User'}
                    {likedCount > 0 && (
                      <span
                        style={{
                          background: 'rgba(236, 72, 153, 0.2)',
                          border: '1px solid rgba(236, 72, 153, 0.4)',
                          color: '#f9a8d4',
                          borderRadius: '20px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '0.05rem 0.4rem',
                        }}
                      >
                        ❤️ {likedCount}
                      </span>
                    )}
                  </button>

                  {showUserMenu && (
                    <div
                      style={{
                        position: 'absolute', top: '110%', right: 0, minWidth: '200px',
                        background: 'var(--bg-card)', border: '1px solid var(--border)',
                        borderRadius: '12px', padding: '0.5rem', zIndex: 100,
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        animation: 'fadeIn 0.2s ease',
                      }}
                    >
                      <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.name}</p>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user.email}</p>
                        {user.preferences?.genres?.length > 0 && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--accent-1)', marginTop: '4px' }}>
                            {user.preferences.genres.slice(0, 3).join(', ')}
                          </p>
                        )}
                      </div>

                      {(likedCount > 0 || dislikedCount > 0) && (
                        <div
                          style={{
                            padding: '0.5rem 0.75rem',
                            borderBottom: '1px solid var(--border)',
                            marginBottom: '0.5rem',
                            display: 'flex',
                            gap: '1rem',
                            fontSize: '0.75rem',
                          }}
                        >
                          {likedCount > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#f9a8d4' }}>
                              <Heart size={12} fill="currentColor" />
                              {likedCount} liked
                            </span>
                          )}
                          {dislikedCount > 0 && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-muted)' }}>
                              <ThumbsDown size={12} />
                              {dislikedCount} disliked
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        className="btn-ghost"
                        style={{ width: '100%', justifyContent: 'flex-start', gap: '0.5rem', borderRadius: '8px', color: 'var(--danger)' }}
                        onClick={handleLogout}
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {seedMsg && (
          <div className="toast">
            {seedMsg}
          </div>
        )}

        <main style={{ flex: 1 }}>
          {children}
        </main>

        <footer style={{ borderTop: '1px solid var(--border)', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          <p>MovieMind AI — Powered by OpenRouter & MongoDB Atlas</p>
        </footer>
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLoginSuccess={setUser} />} />
      <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup onLoginSuccess={setUser} />} />
      <Route 
        path="/onboarding" 
        element={
          !user ? <Navigate to="/login" /> : 
          (user.selectedMovies?.length > 0 ? <Navigate to="/" /> : <Onboarding user={user} onPreferencesUpdated={setUser} />)
        } 
      />
      
      <Route path="/" element={
        <ProtectedRoute>
          {user && <Home preferences={user.preferences} />}
        </ProtectedRoute>
      } />

      <Route path="/movie/:id" element={
        <ProtectedRoute>
          <MovieDetails user={user} />
        </ProtectedRoute>
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Dashboard user={user} />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
