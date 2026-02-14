import React, { useState, useEffect } from 'react';
import { auth, signOut } from '../firebase';
import { fetchStats, fetchRecent, fetchWeekly } from '../services/api';
import StatsCard from './StatsCard';
import PlatformBreakdown from './PlatformBreakdown';
import RecentQueries from './RecentQueries';
import WeeklyChart from './WeeklyChart';
import EmptyState from './EmptyState';

export default function Dashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [user.uid]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, recentData, weeklyData] = await Promise.all([
        fetchStats(),
        fetchRecent(15),
        fetchWeekly(),
      ]);
      setStats(statsData);
      setRecent(recentData);
      setWeekly(weeklyData);
    } catch (err) {
      console.error('[CarbonQ] Failed to load data:', err);
      setError(err.message || 'Failed to load data. Please try again.');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo">CQ</div>
          <div>
            <h1 className="header-title">CarbonQ</h1>
            <p className="header-subtitle">Carbon Footprint Dashboard</p>
          </div>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <span className="user-email-text">{user.email}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn" title="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {loading ? (
          <div className="dashboard-loading">
            <div className="spinner"></div>
            <p>Loading your data...</p>
          </div>
        ) : error ? (
          <div className="dashboard-error">
            <p>{error}</p>
            <button onClick={loadData} className="retry-btn">Try Again</button>
          </div>
        ) : stats && stats.total_queries === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Stats Cards */}
            <div className="stats-row">
              <StatsCard
                label="Total Queries"
                value={stats.total_queries.toLocaleString()}
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                }
                color="blue"
              />
              <StatsCard
                label="CO₂ Emitted"
                value={formatCarbon(stats.total_carbon)}
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                    <line x1="9" y1="9" x2="9.01" y2="9" />
                    <line x1="15" y1="9" x2="15.01" y2="9" />
                  </svg>
                }
                color="green"
                highlight
              />
              <StatsCard
                label="Avg per Query"
                value={stats.avg_carbon.toFixed(1) + ' g'}
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="20" x2="12" y2="10" />
                    <line x1="18" y1="20" x2="18" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="16" />
                  </svg>
                }
                color="amber"
              />
              <StatsCard
                label="Platforms Used"
                value={stats.platform_count}
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                }
                color="purple"
              />
            </div>

            {/* Weekly Chart — full width */}
            {weekly && <WeeklyChart data={weekly} />}

            {/* Two-column layout */}
            <div className="dashboard-grid">
              <div className="grid-left">
                <PlatformBreakdown
                  platforms={stats.platforms}
                  totalQueries={stats.total_queries}
                />
              </div>
              <div className="grid-right">
                {recent && (
                  <RecentQueries queries={recent.queries} />
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function formatCarbon(grams) {
  if (grams >= 1000) {
    return (grams / 1000).toFixed(2) + ' kg';
  }
  return grams.toFixed(1) + ' g';
}
