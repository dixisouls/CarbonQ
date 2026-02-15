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
    totalCarbonEl.textContent = formatCarbon(stats.total_carbon);

    // Top 2 platforms by query count
    const sorted = stats.platforms.slice(0, 2);

    if (sorted.length === 0) {
      topPlatformsEl.innerHTML = '<p class="muted">No queries tracked yet. Start chatting!</p>';
    } else {
      topPlatformsEl.innerHTML = sorted
        .map(
          (platform, idx) => `
        <div class="platform-item">
          <div style="display:flex;align-items:center">
            <span class="rank rank-${idx + 1}">${idx + 1}</span>
            <div class="platform-info">
              <span class="platform-name">${platform.name}</span>
              <span class="platform-queries">${platform.count} ${platform.count === 1 ? 'query' : 'queries'}</span>
            </div>
          </div>
          <span class="platform-carbon">${formatCarbon(platform.carbon)}</span>
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
