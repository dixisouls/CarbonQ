/**
 * CarbonQ Content Script
 * Detects query submissions on AI chat platforms and notifies the background
 * service worker so it can log the event to Firestore.
 */

import { SITE_CONFIG } from '../lib/constants';

// ── Determine which platform we're on ───────────────────────────────────────
const hostname = window.location.hostname;
const platform = SITE_CONFIG[hostname];

if (!platform) {
  // Not a tracked site – do nothing
  // (Should not happen because manifest limits injection, but just in case)
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

// ── Utility: wait for a DOM element to appear ───────────────────────────────
function waitForElement(selector, callback, root = document.body) {
  const el = root.querySelector(selector);
  if (el) {
    callback(el);
    return;
  }

  const observer = new MutationObserver(() => {
    const el = root.querySelector(selector);
    if (el) {
      observer.disconnect();
      callback(el);
    }
  });
  observer.observe(root, { childList: true, subtree: true });
}

// ── Utility: re-attach listeners when SPA navigates / re-renders ────────────
function observeForReattach(selector, setupFn, root = document.body) {
  let currentEl = null;

  const observer = new MutationObserver(() => {
    const el = root.querySelector(selector);
    if (el && el !== currentEl) {
      currentEl = el;
      setupFn(el);
    }
  });
  observer.observe(root, { childList: true, subtree: true });

  // Initial attach
  const el = root.querySelector(selector);
  if (el) {
    currentEl = el;
    setupFn(el);
  }
}

// ── Per-platform detection ──────────────────────────────────────────────────

function setupChatGPT() {
  // ChatGPT uses a form wrapping the textarea area
  observeForReattach('form', (form) => {
    form.addEventListener('submit', (e) => {
      reportQuery();
    }, true);
  });

  // Also listen for Enter (without Shift) on the prompt textarea
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
  // Perplexity uses a textarea inside a form
  observeForReattach('textarea', (textarea) => {
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        reportQuery();
      }
    }, true);
  });

  // Form submit
  observeForReattach('form', (form) => {
    form.addEventListener('submit', () => reportQuery(), true);
  });

  // Submit button
  observeForReattach('button[aria-label="Submit"]', (btn) => {
    btn.addEventListener('click', () => reportQuery(), true);
  });
}

// ── Bootstrap ───────────────────────────────────────────────────────────────
const setupFns = {
  chatgpt: setupChatGPT,
  claude: setupClaude,
  gemini: setupGemini,
  perplexity: setupPerplexity,
};

const setup = setupFns[platform];
if (setup) {
  setup();
  console.log(`[CarbonQ] Tracking queries on ${platform}`);
}
