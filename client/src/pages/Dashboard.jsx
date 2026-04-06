import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Globe, 
  Heart, 
  Star, 
  TrendingUp, 
  History,
  Activity,
  Layers,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProfileAnalysis } from '../services/api.js';

export default function Dashboard() {
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const data = await getProfileAnalysis();
        setAnalysis(data);
      } catch (err) {
        console.error('Fetch analysis error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalysis();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
      </div>
    );
  }

  if (!analysis) return <div className="container">Could not load taste data.</div>;

  return (
    <div className="container fade-in" style={{ paddingBottom: '5rem', paddingTop: '2rem' }}>
      <button 
        className="btn-ghost" 
        onClick={() => navigate('/')} 
        style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.9rem' }}
      >
        <ArrowLeft size={16} />
        Back to Home
      </button>

      <div style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Your Movie Taste Analysis</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Personalized insights based on your interactions.</p>
      </div>

      {/* Hero Stats */}
      <div className="stats-grid" style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '1.5rem', marginBottom: '3rem' 
      }}>
        <StatCard 
          icon={<Heart size={24} style={{ color: '#ec4899' }} />} 
          label="Total Liked" 
          value={analysis.totalLiked} 
          trend="Movies you love"
        />
        <StatCard 
          icon={<TrendingUp size={24} style={{ color: 'var(--accent-1)' }} />} 
          label="Most Watched Category" 
          value={analysis.mostWatchedCategory} 
          trend="Your top genre"
        />
        <StatCard 
          icon={<Activity size={24} style={{ color: 'var(--success)' }} />} 
          label="Profile Accuracy" 
          value="High" 
          trend="Match based on 500+ signals"
        />
      </div>

      <div style={{ 
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '2rem' 
      }}>
        {/* Genre Breakdown */}
        <div className="dashboard-card" style={{ 
          background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)' 
        }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <BarChart3 size={20} style={{ color: 'var(--accent-1)' }} /> Favorite Genres
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {Object.entries(analysis.genres || {})
              .sort((a, b) => b[1] - a[1])
              .map(([genre, count]) => (
                <div key={genre}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                    <span style={{ fontWeight: 600 }}>{genre}</span>
                    <span style={{ opacity: 0.6 }}>{count} movies</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(100, (count / analysis.totalLiked) * 100)}%`, 
                      height: '100%', background: 'linear-gradient(90deg, var(--accent-1), var(--accent-2))',
                      borderRadius: '4px'
                    }} />
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Language Preferences */}
        <div className="dashboard-card" style={{ 
          background: 'var(--bg-card)', padding: '2rem', borderRadius: '24px', border: '1px solid var(--border)' 
        }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
            <Globe size={20} style={{ color: 'var(--success)' }} /> Language Preference
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {Object.entries(analysis.languages || {})
              .sort((a, b) => b[1] - a[1])
              .map(([lang, count], idx) => (
                <div key={lang} style={{ 
                  flex: 1, minWidth: '150px', background: 'rgba(255,255,255,0.03)', 
                  padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)',
                  textAlign: 'center', position: 'relative', overflow: 'hidden'
                }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>{lang}</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{Math.round((count / analysis.totalLiked) * 100) || 0}%</div>
                  <div style={{ 
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', 
                    background: idx === 0 ? 'var(--accent-1)' : idx === 1 ? 'var(--success)' : '#64748b' 
                  }} />
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }) {
  return (
    <div style={{ 
      background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '24px', border: '1px solid var(--border)',
      display: 'flex', gap: '1.2rem', alignItems: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
    }}>
      <div style={{ 
        width: '56px', height: '56px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)'
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{value}</div>
        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '0.2rem' }}>{trend}</div>
      </div>
    </div>
  );
}
