/**
 * CarbonQ Popup
 * Handles login and displays the carbon-tracking dashboard.
 */

import './popup.css';
import {
  auth,
  db,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  collection,
  getDocs,
  query,
  orderBy,
} from '../lib/firebase';
import { CARBON_PER_QUERY, PLATFORM_NAMES } from '../lib/constants';

// ── DOM refs ────────────────────────────────────────────────────────────────
const loadingView = document.getElementById('loading-view');
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const loginError = document.getElementById('login-error');

const userEmailEl = document.getElementById('user-email');
const totalQueriesEl = document.getElementById('total-queries');
const totalCarbonEl = document.getElementById('total-carbon');
const topPlatformsEl = document.getElementById('top-platforms');
const logoutBtn = document.getElementById('logout-btn');
const dashLoading = document.getElementById('dash-loading');

// ── View switching ──────────────────────────────────────────────────────────
function showView(view) {
  [loadingView, loginView, dashboardView].forEach((v) => v.classList.add('hidden'));
  view.classList.remove('hidden');
}

// ── Auth state listener ─────────────────────────────────────────────────────
onAuthStateChanged(auth, async (user) => {
  if (user) {
    userEmailEl.textContent = user.email;
    showView(dashboardView);
    await loadStats(user.uid);
  } else {
    showView(loginView);
  }
});

// ── Login ───────────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
  } catch (err) {
    loginError.textContent = friendlyError(err.code);
    loginError.classList.remove('hidden');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

function friendlyError(code) {
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'Please enter a valid email.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/invalid-credential': 'Invalid email or password.',
  };
  return map[code] || 'Login failed. Please try again.';
}

// ── Logout ──────────────────────────────────────────────────────────────────
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  showView(loginView);
});

// ── Load stats from Firestore ───────────────────────────────────────────────
async function loadStats(uid) {
  dashLoading.classList.remove('hidden');

  try {
    const queriesRef = collection(db, 'users', uid, 'queries');
    const q = query(queriesRef, orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);

    // Aggregate
    const platformCounts = {};
    const platformCarbon = {};
    let totalQueries = 0;
    let totalCarbon = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      const p = data.platform;
      totalQueries++;
      totalCarbon += data.carbonGrams || 0;
      platformCounts[p] = (platformCounts[p] || 0) + 1;
      platformCarbon[p] = (platformCarbon[p] || 0) + (data.carbonGrams || 0);
    });

    // Render totals
    totalQueriesEl.textContent = totalQueries.toLocaleString();
    totalCarbonEl.textContent = formatCarbon(totalCarbon);

    // Top 2 platforms by query count
    const sorted = Object.entries(platformCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    if (sorted.length === 0) {
      topPlatformsEl.innerHTML = '<p class="muted">No queries tracked yet. Start chatting!</p>';
    } else {
      topPlatformsEl.innerHTML = sorted
        .map(
          ([platform, count], idx) => `
        <div class="platform-item">
          <div style="display:flex;align-items:center">
            <span class="rank rank-${idx + 1}">${idx + 1}</span>
            <div class="platform-info">
              <span class="platform-name">${PLATFORM_NAMES[platform] || platform}</span>
              <span class="platform-queries">${count} ${count === 1 ? 'query' : 'queries'}</span>
            </div>
          </div>
          <span class="platform-carbon">${formatCarbon(platformCarbon[platform] || 0)}</span>
        </div>
      `
        )
        .join('');
    }
  } catch (err) {
    console.error('[CarbonQ] Failed to load stats:', err);
    topPlatformsEl.innerHTML = '<p class="muted">Failed to load data.</p>';
  }

  dashLoading.classList.add('hidden');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatCarbon(grams) {
  if (grams >= 1000) {
    return (grams / 1000).toFixed(2) + ' kg';
  }
  return grams.toFixed(1) + ' g';
}
