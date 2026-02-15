/**
 * CarbonQ Popup
 * Handles login and displays the carbon-tracking dashboard.
 */

import './popup.css';
import { authAPI, dashboardAPI, getCurrentUser, isLoggedIn } from '../lib/api';
import { PLATFORM_NAMES } from '../lib/constants';

// ── DOM refs ────────────────────────────────────────────────────────────────
const loadingView = document.getElementById('loading-view');
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');

const loginForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('auth-btn');
const loginError = document.getElementById('auth-error');

const userEmailEl = document.getElementById('user-email');
const totalQueriesEl = document.getElementById('total-queries');
const heroValueEl = document.getElementById('hero-value');
const heroUnitEl = document.getElementById('hero-unit');
const breakdownListEl = document.getElementById('breakdown-list');
const logoutBtn = document.getElementById('logout-btn');
const dashLoading = document.getElementById('dash-loading');

// ── View switching ──────────────────────────────────────────────────────────
function showView(view) {
  [loadingView, loginView, dashboardView].forEach((v) => v.classList.add('hidden'));
  view.classList.remove('hidden');
}

// ── Check auth state on load ────────────────────────────────────────────────
(async function checkAuthState() {
  const loggedIn = await isLoggedIn();
  if (loggedIn) {
    try {
      const user = await getCurrentUser();
      if (user) {
        userEmailEl.textContent = user.email;
        showView(dashboardView);
        await loadStats();
        return;
      }
    } catch (err) {
      console.error('[CarbonQ] Auth check failed:', err);
    }
  }
  showView(loginView);
})();

// ── Login ───────────────────────────────────────────────────────────────────
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.add('hidden');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in...';

  try {
    const data = await authAPI.login(emailInput.value.trim(), passwordInput.value);
    userEmailEl.textContent = data.user.email;
    showView(dashboardView);
    await loadStats();
  } catch (err) {
    loginError.textContent = err.message || 'Login failed. Please try again.';
    loginError.classList.remove('hidden');
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign In';
  }
});

// ── Logout ──────────────────────────────────────────────────────────────────
logoutBtn.addEventListener('click', async () => {
  await authAPI.logout();
  showView(loginView);
});

// ── Load stats from API ─────────────────────────────────────────────────────
async function loadStats() {
  dashLoading.classList.remove('hidden');

  try {
    const stats = await dashboardAPI.stats();

    // Render totals
    totalQueriesEl.textContent = stats.total_queries.toLocaleString();
    
    // Format and display hero carbon value
    const { value, unit } = formatCarbonParts(stats.total_carbon);
    heroValueEl.textContent = value;
    heroUnitEl.textContent = unit;

    // All platforms breakdown
    const platforms = stats.platforms;

    if (platforms.length === 0) {
      breakdownListEl.innerHTML = '<p class="muted">No queries tracked yet. Start chatting!</p>';
    } else {
      breakdownListEl.innerHTML = platforms
        .map(
          (platform) => `
        <div class="breakdown-row">
          <div class="breakdown-service">
            <span class="service-name">${platform.name}</span>
            <span class="service-count">${platform.count} ${platform.count === 1 ? 'query' : 'queries'}</span>
          </div>
          <span class="breakdown-value">${formatCarbon(platform.carbon)}</span>
        </div>
      `
        )
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
  return grams.toFixed(1) + ' g';
}

function formatCarbonParts(grams) {
  if (grams >= 1000) {
    return { value: (grams / 1000).toFixed(2), unit: 'kg' };
  }
  return { value: grams.toFixed(1), unit: 'g' };
}
