/**
 * CarbonQ Background Service Worker
 * Receives QUERY_SUBMITTED messages from content scripts and writes them to
 * the backend API.
 * Queues events in chrome.storage.local when the user is not logged in and
 * flushes the queue once they authenticate.
 */

import { dashboardAPI, isLoggedIn } from '../lib/api';
import { CARBON_PER_QUERY } from '../lib/constants';

// ── Check auth state on startup ─────────────────────────────────────────────
(async function checkAuth() {
  const loggedIn = await isLoggedIn();
  if (loggedIn) {
    // Flush any queued events
    await flushQueue();
  }
})();

// ── Message listener ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'QUERY_SUBMITTED') {
    handleQuerySubmitted(message.platform).then(() => {
      sendResponse({ ok: true });
    });
    return true; // Async response
  }

  if (message.type === 'GET_AUTH_STATE') {
    isLoggedIn().then((loggedIn) => {
      sendResponse({ loggedIn });
    });
    return true; // Async response
  }

  return false;
});

// ── Core: persist a query event ─────────────────────────────────────────────
async function handleQuerySubmitted(platform) {
  const carbonGrams = CARBON_PER_QUERY[platform];
  if (carbonGrams === undefined) {
    console.warn('[CarbonQ] Unknown platform:', platform);
    return;
  }

  const event = {
    platform,
    carbonGrams,
    timestamp: Date.now(),
  };

  const loggedIn = await isLoggedIn();
  if (loggedIn) {
    await writeToAPI(event);
  } else {
    await enqueue(event);
  }
}

// ── API write ───────────────────────────────────────────────────────────────
async function writeToAPI(event) {
  try {
    await dashboardAPI.submitQuery(event.platform, event.carbonGrams);
  } catch (err) {
    console.error('[CarbonQ] API write failed, queuing event:', err);
    await enqueue(event);
  }
}

// ── Offline queue (chrome.storage.local) ────────────────────────────────────
async function enqueue(event) {
  const { carbonq_queue = [] } = await chrome.storage.local.get('carbonq_queue');
  carbonq_queue.push(event);
  await chrome.storage.local.set({ carbonq_queue });
}

async function flushQueue() {
  const loggedIn = await isLoggedIn();
  if (!loggedIn) return;

  const { carbonq_queue = [] } = await chrome.storage.local.get('carbonq_queue');
  if (carbonq_queue.length === 0) return;

  const remaining = [];
  for (const event of carbonq_queue) {
    try {
      await writeToAPIDirect(event);
    } catch {
      remaining.push(event);
    }
  }

  await chrome.storage.local.set({ carbonq_queue: remaining });
}

// Direct write (does not re-queue on failure to avoid infinite loops)
async function writeToAPIDirect(event) {
  await dashboardAPI.submitQuery(event.platform, event.carbonGrams);
}
