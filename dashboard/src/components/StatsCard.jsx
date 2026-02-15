import React from 'react';

export default function StatsCard({ label, value, icon, color = 'blue', highlight = false }) {
  return (
    <div className={`stats-card stats-card-${color}${highlight ? ' stats-card-highlight' : ''}`}>
      <div className="stats-card-icon">{icon}</div>
      <div className="stats-card-content">
        <span className="stats-card-value">{value}</span>
        <span className="stats-card-label">{label}</span>
      </div>
    </div>
  );
}
