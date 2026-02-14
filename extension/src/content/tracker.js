/**
 * CarbonQ Content Script
 * Detects query submissions on AI chat platforms and Google Search, then
 * notifies the background service worker so it can log the event to Firestore.
 */

import { SITE_CONFIG } from '../lib/constants';

// ── Determine which platform we're on ───────────────────────────────────────
const hostname = window.location.hostname;
const platform = SITE_CONFIG[hostname];

if (!platform) {
  // Not a tracked site – bail silently
  throw new Error('CarbonQ: unrecognised host ' + hostname);
}

// ── Debounce helper ─────────────────────────────────────────────────────────
let lastSentTime = 0;
const DEBOUNCE_MS = 800;

function reportQuery() {
  const now = Date.now();
  if (now - lastSentTime < DEBOUNCE_MS) return;
  lastSentTime = now;

  chrome.runtime.sendMessage({ type: 'QUERY_SUBMITTED', platform });
}

// ── Utility: re-attach listeners when SPA navigates / re-renders ────────────
function observeForReattach(selector, setupFn, root = document.body) {
  let currentEl = null;

  const check = () => {
    const el = root.querySelector(selector);
    if (el && el !== currentEl) {
      currentEl = el;
      setupFn(el);
    }
  };

  const observer = new MutationObserver(check);
  observer.observe(root, { childList: true, subtree: true });

  // Initial attach
  check();
}

// ── Per-platform detection ──────────────────────────────────────────────────

function setupChatGPT() {
  // ChatGPT uses a form wrapping the textarea area
  observeForReattach('form', (form) => {
    form.addEventListener('submit', () => reportQuery(), true);
  });

  // Enter (without Shift) on the prompt textarea
  observeForReattach('#prompt-textarea', (textarea) => {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        reportQuery();
      }
    }, true);
  });

  // Send button click fallback
  observeForReattach('button[data-testid="send-button"]', (btn) => {
    btn.addEventListener('click', () => reportQuery(), true);
  });
}

function setupClaude() {
  // Claude uses a ProseMirror contenteditable editor
  observeForReattach('[contenteditable="true"].ProseMirror, [contenteditable="true"]', (editor) => {
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        reportQuery();
      }
    }, true);
  });

  // Send/submit button
  observeForReattach('button[aria-label="Send Message"], button[aria-label="Send message"]', (btn) => {
    btn.addEventListener('click', () => reportQuery(), true);
  });

  // Form submit fallback
  observeForReattach('form', (form) => {
    form.addEventListener('submit', () => reportQuery(), true);
  });
}

function setupGemini() {
  // Gemini may use rich-textarea or standard textarea
  observeForReattach('.ql-editor, [contenteditable="true"], textarea', (editor) => {
    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        reportQuery();
      }
    }, true);
  });

  // Send button
  observeForReattach('button[aria-label="Send message"], button.send-button, button[mattooltip="Send message"]', (btn) => {
    btn.addEventListener('click', () => reportQuery(), true);
  });
}

function setupPerplexity() {
  // 1. Document-level keydown on capturing phase – catches Enter on any
  //    textarea regardless of how deeply Perplexity nests it in React
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      const tag = e.target?.tagName?.toLowerCase();
      const isEditable = e.target?.getAttribute?.('contenteditable') === 'true';
      if (tag === 'textarea' || isEditable) {
        reportQuery();
      }
    }
  }, true);

  // 2. Click on any button that looks like a submit/send
  observeForReattach(
    'button[aria-label="Submit"], button[aria-label="Send"], button.bg-super, button[aria-label="send"]',
    (btn) => {
      btn.addEventListener('click', () => reportQuery(), true);
    }
  );

  // 3. Form submit fallback
  observeForReattach('form', (form) => {
    form.addEventListener('submit', () => reportQuery(), true);
  });

  // 4. Network intercept fallback – inject script into page context
  //    to monkey-patch fetch and detect Perplexity API calls
  injectFetchInterceptor(['/api/query', '/rest/sse/']);
}

function setupGoogle() {
  // Google Search form submission
  observeForReattach('form[action="/search"]', (form) => {
    form.addEventListener('submit', () => reportQuery(), true);
  });

  // Enter key on the search input / textarea
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      const el = e.target;
      const name = el?.getAttribute?.('name');
      const tag = el?.tagName?.toLowerCase();
      if (name === 'q' && (tag === 'input' || tag === 'textarea')) {
        reportQuery();
      }
    }
  }, true);

  // Search button clicks
  observeForReattach('input[name="btnK"], button[aria-label="Google Search"]', (btn) => {
    btn.addEventListener('click', () => reportQuery(), true);
  });
}

// ── Fetch interceptor injection (for Perplexity) ────────────────────────────
function injectFetchInterceptor(apiPatterns) {
  const code = `
    (function() {
      const _origFetch = window.fetch;
      const patterns = ${JSON.stringify(apiPatterns)};
      window.fetch = function(...args) {
        const url = (typeof args[0] === 'string') ? args[0] : args[0]?.url || '';
        const method = (args[1]?.method || 'GET').toUpperCase();
        if (method === 'POST' && patterns.some(p => url.includes(p))) {
          window.dispatchEvent(new CustomEvent('__carbonq_query__'));
        }
        return _origFetch.apply(this, args);
      };
    })();
  `;
  const script = document.createElement('script');
  script.textContent = code;
  (document.head || document.documentElement).appendChild(script);
  script.remove();

  // Listen for the custom event from page context
  window.addEventListener('__carbonq_query__', () => reportQuery());
}

// ── Bootstrap ───────────────────────────────────────────────────────────────
const setupFns = {
  chatgpt: setupChatGPT,
  claude: setupClaude,
  gemini: setupGemini,
  perplexity: setupPerplexity,
  google: setupGoogle,
};

const setup = setupFns[platform];
if (setup) {
  setup();
  console.log(`[CarbonQ] Tracking queries on ${platform}`);
}
