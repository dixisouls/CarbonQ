/**
 * CarbonQ Background Service Worker
 * Receives QUERY_SUBMITTED messages from content scripts and writes them to
 * Firestore under the authenticated user's document.
 * Queues events in chrome.storage.local when the user is not logged in and
 * flushes the queue once they authenticate.
 */

import {
  auth,
  db,
  onAuthStateChanged,
  collection,
  addDoc,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
} from '../lib/firebase';
import { CARBON_PER_QUERY } from '../lib/constants';

// ── State ───────────────────────────────────────────────────────────────────
let currentUser = null;

// ── Auth listener ───────────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    // Ensure user document exists
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { email: user.email, createdAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error('[CarbonQ] Failed to create user doc:', err);
    }

    // Flush any queued events
    await flushQueue();
  }
});

// ── Message listener ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'QUERY_SUBMITTED') {
    handleQuerySubmitted(message.platform);
    sendResponse({ ok: true });
  }

  if (message.type === 'GET_AUTH_STATE') {
    sendResponse({
      loggedIn: !!currentUser,
      email: currentUser?.email || null,
      uid: currentUser?.uid || null,
    });
  }

  // Return true to indicate we may respond asynchronously
  return true;
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

  if (currentUser) {
    await writeToFirestore(currentUser.uid, event);
  } else {
    await enqueue(event);
  }
}

// ── Firestore write ─────────────────────────────────────────────────────────
async function writeToFirestore(uid, event) {
  try {
    const queriesRef = collection(db, 'users', uid, 'queries');
    await addDoc(queriesRef, {
      platform: event.platform,
      carbonGrams: event.carbonGrams,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error('[CarbonQ] Firestore write failed, queuing event:', err);
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
  if (!currentUser) return;

  const { carbonq_queue = [] } = await chrome.storage.local.get('carbonq_queue');
  if (carbonq_queue.length === 0) return;

  const remaining = [];
  for (const event of carbonq_queue) {
    try {
      await writeToFirestoreDirect(currentUser.uid, event);
    } catch {
      remaining.push(event);
    }
  }

  await chrome.storage.local.set({ carbonq_queue: remaining });
}

// Direct write (does not re-queue on failure to avoid infinite loops)
async function writeToFirestoreDirect(uid, event) {
  const queriesRef = collection(db, 'users', uid, 'queries');
  await addDoc(queriesRef, {
    platform: event.platform,
    carbonGrams: event.carbonGrams,
    timestamp: serverTimestamp(),
  });
}
