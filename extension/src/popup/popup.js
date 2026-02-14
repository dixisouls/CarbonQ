/**
 * CarbonQ Popup
 * Handles login/register and displays the carbon-tracking dashboard.
 */

import './popup.css';
import {
  auth,
  db,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  collection,
  getDocs,
  query,
  orderBy,
} from '../lib/firebase';
import { PLATFORM_NAMES, GOOGLE_CARBON_PER_QUERY } from '../lib/constants';

// ── DOM refs ────────────────────────────────────────────────────────────────
const loadingView = document.getElementById('loading-view');
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');

const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authBtn = document.getElementById('auth-btn');
const toggleBtn = document.getElementById('toggle-btn');
const authError = document.getElementById('auth-error');

const userEmailEl = document.getElementById('user-email');
const totalQueriesEl = document.getElementById('total-queries');
const totalCarbonEl = document.getElementById('total-carbon');
const topPlatformsEl = document.getElementById('top-platforms');
const comparisonCard = document.getElementById('comparison-card');
const comparisonText = document.getElementById('comparison-text');
const logoutBtn = document.getElementById('logout-btn');
const dashLoading = document.getElementById('dash-loading');

// ── Auth mode toggle (login / register) ─────────────────────────────────────
let isRegisterMode = false;

toggleBtn.addEventListener('click', () => {
  isRegisterMode = !isRegisterMode;
  authError.classList.add('hidden');

  if (isRegisterMode) {
    authBtn.textContent = 'Create Account';
    toggleBtn.textContent = 'Back to Sign In';
  } else {
    authBtn.textContent = 'Sign In';
    toggleBtn.textContent = 'Create Account';
  }
});

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

// ── Auth form submit (login or register) ────────────────────────────────────
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.classList.add('hidden');
  authBtn.disabled = true;

  const originalText = authBtn.textContent;
  authBtn.textContent = isRegisterMode ? 'Creating account...' : 'Signing in...';

  try {
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (isRegisterMode) {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (err) {
    authError.textContent = friendlyError(err.code);
    authError.classList.remove('hidden');
    authBtn.disabled = false;
    authBtn.textContent = originalText;
  }
});

function friendlyError(code) {
  const map = {
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-email': 'Please enter a valid email.',
    'auth/too-many-requests': 'Too many attempts. Try again later.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',
  };
  return map[code] || 'Something went wrong. Please try again.';
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
    let aiQueries = 0;
    let aiCarbon = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const p = data.platform;
      totalQueries++;
      totalCarbon += data.carbonGrams || 0;
      platformCounts[p] = (platformCounts[p] || 0) + 1;
      platformCarbon[p] = (platformCarbon[p] || 0) + (data.carbonGrams || 0);

      // Track AI-only queries (everything except Google)
      if (p !== 'google') {
        aiQueries++;
        aiCarbon += data.carbonGrams || 0;
      }
    });

    // Render totals
    totalQueriesEl.textContent = totalQueries.toLocaleString();
    totalCarbonEl.textContent = formatCarbon(totalCarbon);

    // Comparison card: extra CO2 cost of using AI over Google Search
    if (aiQueries > 0) {
      const googleEquivalent = aiQueries * GOOGLE_CARBON_PER_QUERY;
      const extraCarbon = aiCarbon - googleEquivalent;

      comparisonText.innerHTML =
        `Your <strong>${aiQueries}</strong> AI ${aiQueries === 1 ? 'query' : 'queries'} used ` +
        `<strong>${formatCarbon(extraCarbon)}</strong> more CO&#8322; than the same number of Google searches would have.`;
      comparisonCard.classList.remove('hidden');
    } else {
      comparisonCard.classList.add('hidden');
    }

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
          <div class="platform-left">
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
