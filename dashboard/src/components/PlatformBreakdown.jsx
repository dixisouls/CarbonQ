import React from 'react';

export default function PlatformBreakdown({ platforms, totalQueries }) {
  return (
    <div className="card platform-card">
      <div className="card-header">
        <h3>Platform Breakdown</h3>
        <span className="card-badge">{platforms.length} platforms</span>
      </div>
      <div className="platform-breakdown-list">
        {platforms.map((platform, idx) => (
          <div key={platform.key} className="platform-row">
            <div className="platform-row-left">
              <span className="platform-rank" style={{ background: `${platform.color}20`, color: platform.color }}>
                {idx + 1}
              </span>
              <div className="platform-row-info">
                <div className="platform-row-header">
                  <span className="platform-row-icon">{platform.icon}</span>
                  <span className="platform-row-name">{platform.name}</span>
                </div>
                <div className="platform-row-stats">
                  <span>{platform.count} {platform.count === 1 ? 'query' : 'queries'}</span>
                  <span className="dot-sep">·</span>
                  <span>{formatCarbon(platform.carbon)}</span>
                </div>
              </div>
            </div>
            <div className="platform-row-right">
              <span className="platform-percentage">{platform.percentage.toFixed(0)}%</span>
            </div>
            {/* Progress bar */}
            <div className="platform-bar-track">
              <div
                className="platform-bar-fill"
                style={{
                  width: `${platform.percentage}%`,
                  background: platform.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatCarbon(grams) {
  if (grams >= 1000) {
    return (grams / 1000).toFixed(2) + ' kg CO₂';
  }
  return grams.toFixed(1) + ' g CO₂';
}
