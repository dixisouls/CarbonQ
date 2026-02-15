import React from 'react';
import { PLATFORM_COLORS, PLATFORM_ICONS } from '../constants';

export default function RecentQueries({ queries }) {
  return (
    <div className="card recent-card">
      <div className="card-header">
        <h3>Recent Queries</h3>
        <span className="card-badge">{queries.length} latest</span>
      </div>
      <div className="recent-list">
        {queries.map((q) => {
          const time = q.timestamp ? formatTime(new Date(q.timestamp)) : 'Just now';
          const platformColor = PLATFORM_COLORS[q.platform] || '#6b7280';
          const platformIcon = PLATFORM_ICONS[q.platform] || '💬';

          return (
            <div key={q.id} className="recent-item">
              <div className="recent-item-left">
                <span
                  className="recent-platform-badge"
                  style={{ background: `${platformColor}15`, color: platformColor }}
                >
                  <span className="recent-icon">{platformIcon}</span>
                  {q.platform_name}
                </span>
              </div>
              <div className="recent-item-right">
                <span className="recent-carbon">{q.carbon_grams?.toFixed(1)} g</span>
                <span className="recent-time">{time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
