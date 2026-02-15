import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-logo">
          <div className="logo-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="M8 12s1.5-2 4-2 4 2 4 2" />
              <path d="M9 16s1 1 3 1 3-1 3-1" />
              <circle cx="9" cy="9" r="0.5" fill="currentColor" />
              <circle cx="15" cy="9" r="0.5" fill="currentColor" />
            </svg>
          </div>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    </div>
  );
}
