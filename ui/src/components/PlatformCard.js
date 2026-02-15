import React from 'react';
import { getPlatformIcon } from '../utils/platformIcons';
import './PlatformCard.css';

export default function PlatformCard({ platform, total }) {
  const percentage = total > 0 ? ((platform.count / total) * 100).toFixed(0) : 0;

  return (
    <div className="platform-card">
      <div className="platform-card-header">
        <span className="platform-card-icon">
          {getPlatformIcon(platform.key, 24)}
        </span>
        <div className="platform-card-info">
          <span className="platform-card-name">{platform.name}</span>
          <span className="platform-card-count">{platform.count} queries</span>
        </div>
        <span
          className="platform-card-pct"
          style={{ color: platform.color }}
        >
          {percentage}%
        </span>
      </div>
      <div className="platform-card-bar-bg">
        <div
          className="platform-card-bar"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${platform.color}, ${platform.color}aa)`,
          }}
        />
      </div>
      <div className="platform-card-footer">
        <span className="platform-card-carbon">
          {platform.carbon.toFixed(1)}g CO₂
        </span>
      </div>
    </div>
  );
}
