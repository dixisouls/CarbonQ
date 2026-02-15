import React from 'react';

export default function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
          <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
          <line x1="6" y1="2" x2="6" y2="4" />
          <line x1="10" y1="2" x2="10" y2="4" />
          <line x1="14" y1="2" x2="14" y2="4" />
        </svg>
      </div>
      <h3>No queries tracked yet</h3>
      <p>Install the CarbonQ browser extension and start chatting with AI platforms to see your carbon footprint data here.</p>
      <div className="empty-steps">
        <div className="empty-step">
          <span className="step-number">1</span>
          <span>Install the CarbonQ extension</span>
        </div>
        <div className="empty-step">
          <span className="step-number">2</span>
          <span>Sign in with the same account</span>
        </div>
        <div className="empty-step">
          <span className="step-number">3</span>
          <span>Chat with ChatGPT, Claude, Gemini, or Perplexity</span>
        </div>
      </div>
    </div>
  );
}
