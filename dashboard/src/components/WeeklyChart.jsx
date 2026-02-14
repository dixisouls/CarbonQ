import React, { useState } from 'react';

export default function WeeklyChart({ data }) {
  const [metric, setMetric] = useState('carbon'); // 'carbon' | 'queries'
  const { days, total_queries, total_carbon } = data;

  const values = days.map((d) => (metric === 'carbon' ? d.carbon : d.queries));
  const maxVal = Math.max(...values, 1);

  return (
    <div className="card weekly-card">
      <div className="card-header">
        <div>
          <h3>Last 7 Days</h3>
          <span className="weekly-summary">
            {total_queries} queries · {formatCarbon(total_carbon)}
          </span>
        </div>
        <div className="weekly-toggle">
          <button
            className={`toggle-btn ${metric === 'carbon' ? 'active' : ''}`}
            onClick={() => setMetric('carbon')}
          >
            CO₂
          </button>
          <button
            className={`toggle-btn ${metric === 'queries' ? 'active' : ''}`}
            onClick={() => setMetric('queries')}
          >
            Queries
          </button>
        </div>
      </div>

      <div className="weekly-chart">
        <div className="chart-bars">
          {days.map((day, i) => {
            const val = metric === 'carbon' ? day.carbon : day.queries;
            const height = maxVal > 0 ? (val / maxVal) * 100 : 0;
            const isToday = i === days.length - 1;

            return (
              <div key={day.date} className="chart-col">
                <div className="chart-tooltip">
                  <span className="tooltip-value">
                    {metric === 'carbon'
                      ? `${val.toFixed(1)} g`
                      : `${val} ${val === 1 ? 'query' : 'queries'}`}
                  </span>
                  <span className="tooltip-date">{day.date}</span>
                </div>
                <div className="chart-bar-wrapper">
                  <div
                    className={`chart-bar ${isToday ? 'chart-bar-today' : ''}`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
                <span className={`chart-label ${isToday ? 'chart-label-today' : ''}`}>
                  {day.label}
                </span>
              </div>
            );
          })}
        </div>
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
