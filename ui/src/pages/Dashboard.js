import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { dashboardAPI } from '../services/api';
import {
  Leaf, LogOut, Activity, Cloud, Search, Zap,
  TrendingUp, TrendingDown, Minus, Sprout, TreePine
} from 'lucide-react';
import { getPlatformIcon } from '../utils/platformIcons';
import EmissionsChart from '../components/EmissionsChart';
import QueriesChart from '../components/QueriesChart';
import PlatformCard from '../components/PlatformCard';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [weekly, setWeekly] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, weeklyRes, comparisonRes] = await Promise.all([
          dashboardAPI.stats(),
          dashboardAPI.weekly(),
          dashboardAPI.googleSearchComparison(),
        ]);
        setStats(statsRes.data);
        setWeekly(weeklyRes.data);
        setComparison(comparisonRes.data);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const trend = useMemo(() => {
    if (!weekly?.days || weekly.days.length < 2) return { direction: 'flat', percent: 0 };
    const days = weekly.days;
    const recent = days.slice(-3).reduce((s, d) => s + d.carbon, 0) / 3;
    const older = days.slice(0, 3).reduce((s, d) => s + d.carbon, 0) / 3;
    if (older === 0) return { direction: 'flat', percent: 0 };
    const pct = ((recent - older) / older) * 100;
    return {
      direction: pct > 5 ? 'up' : pct < -5 ? 'down' : 'flat',
      percent: Math.abs(pct).toFixed(1),
    };
  }, [weekly]);

  const predicted = useMemo(() => {
    if (!weekly?.days) return 0;
    const avg = weekly.total_carbon / Math.max(weekly.days.filter(d => d.carbon > 0).length, 1);
    return (avg * 7).toFixed(1);
  }, [weekly]);

  const topPlatform = useMemo(() => {
    if (!stats?.platforms?.length) return null;
    return stats.platforms.reduce((a, b) => a.count > b.count ? a : b);
  }, [stats]);

  const nextSearchCarbon = useMemo(() => {
    if (!stats) return 0;
    return stats.avg_carbon?.toFixed(1) || 0;
  }, [stats]);

  const carbonSavings = useMemo(() => {
    if (!weekly?.days || weekly.days.length < 2) return null;
    const days = weekly.days;
    const recent = days.slice(-3).reduce((s, d) => s + d.carbon, 0) / 3;
    const older = days.slice(0, 3).reduce((s, d) => s + d.carbon, 0) / 3;
    if (older === 0) return null;
    const reducedPerDay = older - recent;
    if (reducedPerDay <= 0) return null;
    const co2Reduced = (reducedPerDay * 3);
    const treeHours = co2Reduced / 2.5;
    return {
      co2Reduced: co2Reduced.toFixed(1),
      treeHours: treeHours.toFixed(1),
    };
  }, [weekly]);

  const ecoScore = useMemo(() => {
    const avg = parseFloat(nextSearchCarbon) || 0;
    if (avg <= 0.3) return { dots: 5, label: 'Excellent' };
    if (avg <= 0.8) return { dots: 4, label: 'Great' };
    if (avg <= 2.0) return { dots: 3, label: 'Good' };
    if (avg <= 5.0) return { dots: 2, label: 'Fair' };
    return { dots: 1, label: 'High Impact' };
  }, [nextSearchCarbon]);

  if (loading) {
    return (
      <div className="dash-loading">
        <div className="loader" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-header-left">
          <div className="dash-logo">
            <Leaf size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="dash-title">CarbonQ</h1>
            <p className="dash-subtitle">{user?.email}</p>
          </div>
        </div>
        <button className="dash-logout" onClick={logout}>
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </header>

      <main className="dash-main">
        {/* Stats Row */}
        <div className="dash-stats animate-fade-in-up">
          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-blue">
              <Activity size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total LLM Queries</span>
              <span className="stat-value">{stats?.total_queries || 0}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-green">
              <Cloud size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">CO₂ Emitted</span>
              <span className="stat-value stat-value-green">
                {stats?.total_carbon?.toFixed(1) || 0}
                <span className="stat-unit">g</span>
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-purple">
              <Zap size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Predicted Next Week</span>
              <span className="stat-value">
                {predicted}
                <span className="stat-unit">g CO₂</span>
              </span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrap stat-icon-amber">
              {trend.direction === 'up' ? <TrendingUp size={20} /> :
               trend.direction === 'down' ? <TrendingDown size={20} /> :
               <Minus size={20} />}
            </div>
            <div className="stat-content">
              <span className="stat-label">Weekly Trend</span>
              <span className={`stat-value ${trend.direction === 'down' ? 'stat-value-green' : trend.direction === 'up' ? 'stat-value-red' : ''}`}>
                {trend.direction === 'flat' ? 'Stable' :
                 `${trend.percent}% ${trend.direction === 'up' ? '↑' : '↓'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="dash-charts animate-fade-in-up stagger-2">
          <div className="dash-chart-card">
            <h3 className="chart-title">
              <Cloud size={16} />
              CO₂ Emissions
            </h3>
            <p className="chart-subtitle">Daily carbon footprint (grams)</p>
            <EmissionsChart data={weekly?.days || []} />
          </div>

          <div className="dash-chart-card">
            <h3 className="chart-title">
              <Activity size={16} />
              Queries Per Day
            </h3>
            <p className="chart-subtitle">Daily AI platform usage</p>
            <QueriesChart data={weekly?.days || []} />
          </div>
        </div>

        {/* Bottom Row */}
        <div className="dash-bottom animate-fade-in-up stagger-4">
          {/* Most Used Platform - stays in position 1 */}
          <div className="dash-bottom-card">
            <h3 className="chart-title">
              <Search size={16} />
              Most Used Platform
            </h3>
            {topPlatform ? (
              <PlatformCard platform={topPlatform} total={stats?.total_queries || 1} />
            ) : (
              <p className="dash-empty">No data yet</p>
            )}

            {/* All Platforms */}
            {stats?.platforms?.length > 1 && (
              <div className="platform-list">
                {stats.platforms
                  .filter(p => p.key !== topPlatform?.key)
                  .map((p) => (
                    <div key={p.key} className="platform-mini">
                      <span className="platform-mini-icon">
                        {getPlatformIcon(p.key, 16)}
                      </span>
                      <span className="platform-mini-name">{p.name}</span>
                      <div className="platform-mini-bar-wrap">
                        <div
                          className="platform-mini-bar"
                          style={{
                            width: `${p.percentage}%`,
                            background: p.color,
                          }}
                        />
                      </div>
                      <span className="platform-mini-count">{p.count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Carbon Savings / Google Search Comparison */}
          <div className={`dash-bottom-card ${trend.direction === 'down' && carbonSavings ? 'carbon-savings-card' : 'google-comparison-card'}`}>
            <h3 className="chart-title">
              {trend.direction === 'down' && carbonSavings ? <TreePine size={16} /> : <Search size={16} />}
              Your Carbon Savings
            </h3>
            {trend.direction === 'down' && carbonSavings ? (
              <div className="comparison-content">
                <div className="savings-hero">
                  <span className="savings-hero-value">{carbonSavings.treeHours}</span>
                  <span className="savings-hero-label">Tree Hours Saved</span>
                </div>
                <div className="comparison-stats">
                  <div className="comparison-stat comparison-stat-actual">
                    <span className="comparison-stat-label">Current Emissions</span>
                    <span className="comparison-stat-value">
                      {comparison?.actual_emission || stats?.total_carbon?.toFixed(1) || 0}g CO₂
                    </span>
                  </div>
                  <div className="comparison-stat comparison-stat-reduced">
                    <span className="comparison-stat-label">CO₂ Reduced</span>
                    <span className="comparison-stat-value">
                      {carbonSavings.co2Reduced}g CO₂
                    </span>
                  </div>
                </div>
              </div>
            ) : comparison?.sufficient_data ? (
              <div className="comparison-content">
                <div className="comparison-multiplier">
                  <span className="comparison-multiplier-value">{comparison.times_more}×</span>
                  <span className="comparison-multiplier-label">more CO₂</span>
                </div>
                <div className="comparison-stats">
                  <div className="comparison-stat comparison-stat-actual">
                    <span className="comparison-stat-label">Current Emissions</span>
                    <span className="comparison-stat-value">
                      {comparison.actual_emission}g CO₂
                    </span>
                  </div>
                  <div className="comparison-stat comparison-stat-forecast">
                    <span className="comparison-stat-label">If 35% were Google Search</span>
                    <span className="comparison-stat-value">
                      {comparison.forecasted_emission}g CO₂
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="comparison-no-data">
                <p className="dash-empty">Not enough data yet</p>
                <p className="comparison-hint">Need at least 7 days of queries</p>
              </div>
            )}
          </div>

          {/* Next Search CO2 - moved to position 3, smaller */}
          <div className="dash-bottom-card next-search-card-small">
            <div className="next-search-content-small">
              <div className="next-search-icon-small">
                <Sprout size={24} />
              </div>
              <div className="next-search-info-small">
                <span className="next-search-label-small">Your Next Search</span>
                <span className="next-search-value-small">
                  ~{nextSearchCarbon}
                  <span className="next-search-unit-small">g CO₂</span>
                </span>
                <span className="next-search-hint-small">Average per query</span>
              </div>
              <div className="eco-score">
                <div className="eco-score-dots">
                  {[1, 2, 3, 4, 5].map(i => (
                    <span
                      key={i}
                      className={`eco-dot ${i <= ecoScore.dots ? 'eco-dot-active' : 'eco-dot-inactive'}`}
                    />
                  ))}
                </div>
                <span className="eco-score-label">Eco Score: {ecoScore.label}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
