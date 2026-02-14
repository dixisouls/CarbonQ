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
import { PLATFORM_NAMES, CARBON_PER_QUERY, GOOGLE_CARBON_PER_QUERY } from '../lib/constants';

// Platform icons (favicons from domains or bundled files)
const PLATFORM_ICONS = {
  chatgpt: 'https://chatgpt.com/favicon.ico',
  claude: 'https://claude.ai/favicon.ico',
  gemini: 'icons/platforms/gemini.svg',
  perplexity: 'icons/platforms/perplexity.png',
  google: 'https://www.google.com/favicon.ico',
};

// Average LLM emission for savings calculation
const AVG_LLM =
  (CARBON_PER_QUERY.chatgpt +
    CARBON_PER_QUERY.claude +
    CARBON_PER_QUERY.gemini +
    CARBON_PER_QUERY.perplexity) /
  4;

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
const heroValueEl = document.getElementById('hero-value');
const heroUnitEl = document.getElementById('hero-unit');
const totalQueriesEl = document.getElementById('total-queries');
const breakdownListEl = document.getElementById('breakdown-list');
const savingsCard = document.getElementById('savings-card');
const savingsText = document.getElementById('savings-text');
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

    const platformCounts = {};
    const platformCarbon = {};
    let totalQueries = 0;
    let totalCarbon = 0;
    let googleQueries = 0;

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const p = data.platform;
      totalQueries++;
      totalCarbon += data.carbonGrams || 0;
      platformCounts[p] = (platformCounts[p] || 0) + 1;
      platformCarbon[p] = (platformCarbon[p] || 0) + (data.carbonGrams || 0);
      if (p === 'google') googleQueries++;
    });

    // Hero card
    const heroUnit = totalCarbon >= 1000 ? 'kg' : 'g';
    const heroVal =
      totalCarbon >= 1000 ? (totalCarbon / 1000).toFixed(2) : totalCarbon.toFixed(1);
    heroValueEl.textContent = heroVal;
    heroUnitEl.textContent = `CO₂ ${heroUnit}`;
    totalQueriesEl.textContent = totalQueries.toLocaleString();

    // Green savings card (only when user has Google searches)
    if (googleQueries > 0) {
      const googleSaved = googleQueries * (AVG_LLM - GOOGLE_CARBON_PER_QUERY);
      savingsText.innerHTML =
        `Your <strong>${googleQueries}</strong> Google search${googleQueries > 1 ? 'es' : ''} ` +
        `saved an estimated <strong>${formatCarbon(googleSaved)} CO₂</strong> compared to using an LLM.`;
      savingsCard.classList.remove('hidden');
    } else {
      savingsCard.classList.add('hidden');
    }

    // Breakdown by Service — all platforms, Google shown distinctly
    const platforms = ['chatgpt', 'claude', 'gemini', 'perplexity', 'google'];

    if (totalQueries === 0) {
      breakdownListEl.innerHTML =
        '<p class="muted">No queries tracked yet. Use ChatGPT, Claude, Gemini, Perplexity, or Google Search and your carbon footprint will appear here.</p>';
    } else {
      breakdownListEl.innerHTML = platforms
        .map((key) => {
          const data = { queries: platformCounts[key] || 0, emission: platformCarbon[key] || 0 };
          if (data.queries === 0) return '';
          const rowClass = key === 'google' ? 'site-row google-row' : 'site-row';
          const iconSrc = PLATFORM_ICONS[key];
          const iconHtml = iconSrc
            ? `<div class="site-icon"><img src="${iconSrc}" alt="${PLATFORM_NAMES[key] || key}" class="site-icon-img" /></div>`
            : '';
          return `
            <div class="${rowClass}">
              <div class="site-icon">${iconHtml}</div>
              <div class="site-name">${PLATFORM_NAMES[key] || key}</div>
              <div class="site-stats">
                <div class="site-queries">${data.queries}</div>
                <div class="site-emission">${formatCarbon(data.emission)} CO₂</div>
              </div>
            </div>
          `;
        })
        .filter(Boolean)
        .join('');
    }
  } catch (err) {
    console.error('[CarbonQ] Failed to load stats:', err);
    breakdownListEl.innerHTML = '<p class="muted">Failed to load data.</p>';
  }

  dashLoading.classList.add('hidden');
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatCarbon(grams) {
  if (grams >= 1000) {
    return (grams / 1000).toFixed(2) + ' kg';
  }
  return grams.toFixed(2) + ' g';
}
