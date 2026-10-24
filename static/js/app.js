/**
 * NeuralStock AI - Frontend Client Controller
 * Manages reactive UI state, REST API calls, Chart.js financial & forecast rendering,
 * and technical indicator metrics displays.
 */

// Application State
const state = {
  theme: localStorage.getItem("neuralstock_theme") || "light",
  authToken: localStorage.getItem("neuralstock_token") || null,
  currentUser: JSON.parse(localStorage.getItem("neuralstock_user") || "null"),
  symbol: "NVDA",
  period: "1y",
  horizonDays: 14,
  stockData: null,
  predictionData: null,
  showSma: true,
  showBb: true,
  showForecast: true,
  watchlist: JSON.parse(localStorage.getItem("neuralstock_watchlist") || '["NVDA", "AAPL", "TSLA", "BTC-USD", "RELIANCE.NS"]'),
  mainChart: null,
  backtestChart: null,
  chatHistory: [],
  isChatOpen: false,
  isBotTyping: false,
  portfolio: JSON.parse(localStorage.getItem("neuralstock_portfolio") || JSON.stringify({
    cash: 100000.0,
    holdings: { "NVDA": { shares: 15, avgPrice: 195.0 } },
    history: []
  })),
  alerts: JSON.parse(localStorage.getItem("neuralstock_alerts") || JSON.stringify([
    { id: 1, symbol: "NVDA", condition: "above", targetPrice: 215.0, status: "Active" }
  ])),
  isVoiceNarrationEnabled: false,
  isRecordingVoice: false,
};

// DOM Elements
const elements = {
  searchInput: document.getElementById("tickerSearchInput"),
  searchDropdown: document.getElementById("searchDropdown"),
  quickPicksBar: document.getElementById("quickPicksBar"),
  runPredictionBtn: document.getElementById("runPredictionBtn"),
  exportReportBtn: document.getElementById("exportReportBtn"),
  marketStatusText: document.getElementById("marketStatusText"),
  marketStatusPill: document.getElementById("marketStatusPill"),

  // Theme & Settings Elements
  themeLightBtn: document.getElementById("themeLightBtn"),
  themeDarkBtn: document.getElementById("themeDarkBtn"),
  openSettingsBtn: document.getElementById("openSettingsBtn"),
  closeSettingsModalBtn: document.getElementById("closeSettingsModalBtn"),
  settingsModal: document.getElementById("settingsModal"),
  themeOptionLight: document.getElementById("themeOptionLight"),
  themeOptionDark: document.getElementById("themeOptionDark"),
  settingDefaultHorizon: document.getElementById("settingDefaultHorizon"),
  settingVoiceNarration: document.getElementById("settingVoiceNarration"),
  settingResetStorageBtn: document.getElementById("settingResetStorageBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),

  // Security & Authentication Elements
  headerSignInBtn: document.getElementById("headerSignInBtn"),
  headerUserDropdownWrapper: document.getElementById("headerUserDropdownWrapper"),
  userProfileBtn: document.getElementById("userProfileBtn"),
  headerUserAvatar: document.getElementById("headerUserAvatar"),
  headerUserName: document.getElementById("headerUserName"),
  headerUserRole: document.getElementById("headerUserRole"),
  userMenuDropdown: document.getElementById("userMenuDropdown"),
  dropdownUserName: document.getElementById("dropdownUserName"),
  dropdownUserEmail: document.getElementById("dropdownUserEmail"),
  dropdownUserRole: document.getElementById("dropdownUserRole"),
  menuOpenSettingsBtn: document.getElementById("menuOpenSettingsBtn"),
  headerSignOutBtn: document.getElementById("headerSignOutBtn"),
  authModal: document.getElementById("authModal"),
  closeAuthModalBtn: document.getElementById("closeAuthModalBtn"),
  authTabSignInBtn: document.getElementById("authTabSignInBtn"),
  authTabSignUpBtn: document.getElementById("authTabSignUpBtn"),
  authStatusBanner: document.getElementById("authStatusBanner"),
  signInForm: document.getElementById("signInForm"),
  signUpForm: document.getElementById("signUpForm"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  toggleLoginPwBtn: document.getElementById("toggleLoginPwBtn"),
  switchToSignUpLink: document.getElementById("switchToSignUpLink"),
  regFullName: document.getElementById("regFullName"),
  regUsername: document.getElementById("regUsername"),
  regEmail: document.getElementById("regEmail"),
  regPassword: document.getElementById("regPassword"),
  toggleRegPwBtn: document.getElementById("toggleRegPwBtn"),
  pwStrengthFill: document.getElementById("pwStrengthFill"),
  pwStrengthText: document.getElementById("pwStrengthText"),
  switchToSignInLink: document.getElementById("switchToSignInLink"),
  
  // Asset Banner
  assetSymbol: document.getElementById("assetSymbol"),
  assetName: document.getElementById("assetName"),
  assetSector: document.getElementById("assetSector"),
  assetExchange: document.getElementById("assetExchange"),
  assetMarketCap: document.getElementById("assetMarketCap"),
  assetPE: document.getElementById("assetPE"),
  assetBeta: document.getElementById("assetBeta"),
  assetPrice: document.getElementById("assetPrice"),
  currencySymbol: document.getElementById("currencySymbol"),
  priceChangePill: document.getElementById("priceChangePill"),
  priceChangeArrow: document.getElementById("priceChangeArrow"),
  priceChangeValue: document.getElementById("priceChangeValue"),
  periodChangePill: document.getElementById("periodChangePill"),
  periodChangeArrow: document.getElementById("periodChangeArrow"),
  periodChangeValue: document.getElementById("periodChangeValue"),
  periodLabel: document.getElementById("periodLabel"),
  periodRangeText: document.getElementById("periodRangeText"),

  // Chart & Controls
  chartLoadingOverlay: document.getElementById("chartLoadingOverlay"),
  loadingStatusText: document.getElementById("loadingStatusText"),
  horizonSlider: document.getElementById("horizonSlider"),
  horizonDaysLabel: document.getElementById("horizonDaysLabel"),
  timeframeButtons: document.getElementById("timeframeButtons"),
  toggleSmaBtn: document.getElementById("toggleSmaBtn"),
  toggleBbBtn: document.getElementById("toggleBbBtn"),
  toggleForecastBtn: document.getElementById("toggleForecastBtn"),
  mainStockChartCanvas: document.getElementById("mainStockChart"),

  // Intelligence & Recommendation
  recommendationBadge: document.getElementById("recommendationBadge"),
  sentimentLabel: document.getElementById("sentimentLabel"),
  sentimentScorePercent: document.getElementById("sentimentScorePercent"),
  sentimentFillBar: document.getElementById("sentimentFillBar"),
  target1dPrice: document.getElementById("target1dPrice"),
  target1dChange: document.getElementById("target1dChange"),
  target7dPrice: document.getElementById("target7dPrice"),
  target7dChange: document.getElementById("target7dChange"),
  target30dPrice: document.getElementById("target30dPrice"),
  target30dChange: document.getElementById("target30dChange"),
  suggestedStopLoss: document.getElementById("suggestedStopLoss"),
  suggestedTakeProfit: document.getElementById("suggestedTakeProfit"),
  aiKeyInsightsList: document.getElementById("aiKeyInsightsList"),

  // Tabs & Diagnostics
  metricAccuracy: document.getElementById("metricAccuracy"),
  metricMae: document.getElementById("metricMae"),
  metricRmse: document.getElementById("metricRmse"),
  metricR2: document.getElementById("metricR2"),
  featureImportanceList: document.getElementById("featureImportanceList"),
  backtestChartCanvas: document.getElementById("backtestChart"),
  techIndicatorsGrid: document.getElementById("techIndicatorsGrid"),
  riskLevelsGrid: document.getElementById("riskLevelsGrid"),

  // Watchlist
  watchlistContainer: document.getElementById("watchlistContainer"),
  addWatchlistBtn: document.getElementById("addWatchlistBtn"),
  toastNotification: document.getElementById("toastNotification"),

  // Chatbot
  chatbotLauncherBtn: document.getElementById("chatbotLauncherBtn"),
  chatbotWindow: document.getElementById("chatbotWindow"),
  chatCloseBtn: document.getElementById("chatCloseBtn"),
  chatClearBtn: document.getElementById("chatClearBtn"),
  chatVoiceToggleBtn: document.getElementById("chatVoiceToggleBtn"),
  chatMicBtn: document.getElementById("chatMicBtn"),
  chatActiveSymbolStatus: document.getElementById("chatActiveSymbolStatus"),
  chatContextTicker: document.getElementById("chatContextTicker"),
  chatContextQuote: document.getElementById("chatContextQuote"),
  chatSuggestionChips: document.getElementById("chatSuggestionChips"),
  chatMessagesList: document.getElementById("chatMessagesList"),
  chatInputForm: document.getElementById("chatInputForm"),
  chatMessageInput: document.getElementById("chatMessageInput"),
  chatSendBtn: document.getElementById("chatSendBtn"),

  // News & Sentiment
  newsOverallLabel: document.getElementById("newsOverallLabel"),
  newsBullishPct: document.getElementById("newsBullishPct"),
  newsNeutralPct: document.getElementById("newsNeutralPct"),
  newsBearishPct: document.getElementById("newsBearishPct"),
  newsArticlesList: document.getElementById("newsArticlesList"),

  // Screener
  refreshScreenerBtn: document.getElementById("refreshScreenerBtn"),
  screenerTableBody: document.getElementById("screenerTableBody"),

  // Paper Trading & Portfolio
  portfolioNetWorth: document.getElementById("portfolioNetWorth"),
  portfolioCash: document.getElementById("portfolioCash"),
  portfolioPnl: document.getElementById("portfolioPnl"),
  portfolioPnlPct: document.getElementById("portfolioPnlPct"),
  portfolioPositionsCount: document.getElementById("portfolioPositionsCount"),
  tradeSymbolTitle: document.getElementById("tradeSymbolTitle"),
  tradeLivePrice: document.getElementById("tradeLivePrice"),
  tradeSharesInput: document.getElementById("tradeSharesInput"),
  tradeEstimatedCost: document.getElementById("tradeEstimatedCost"),
  buySharesBtn: document.getElementById("buySharesBtn"),
  sellSharesBtn: document.getElementById("sellSharesBtn"),
  resetPortfolioBtn: document.getElementById("resetPortfolioBtn"),
  portfolioHoldingsBody: document.getElementById("portfolioHoldingsBody"),

  // Price Alerts
  alertSymbolTitle: document.getElementById("alertSymbolTitle"),
  alertConditionSelect: document.getElementById("alertConditionSelect"),
  alertTargetPriceInput: document.getElementById("alertTargetPriceInput"),
  createAlertBtn: document.getElementById("createAlertBtn"),
  alertsTableBody: document.getElementById("alertsTableBody"),
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(state.theme);
  setupEventListeners();
  setupAuth();
  checkSession();
  renderWatchlist();
  renderPortfolio();
  renderAlerts();
  setupVoiceRecognition();
  loadScreenerData();
  loadStockAndPredict(state.symbol, state.period, state.horizonDays);
});

// Apply Visual Theme (Light Professional or Dark Cyberpunk)
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("neuralstock_theme", theme);

  if (elements.themeLightBtn && elements.themeDarkBtn) {
    elements.themeLightBtn.classList.toggle("active", theme === "light");
    elements.themeDarkBtn.classList.toggle("active", theme === "dark");
  }

  // Update Settings Radio
  const lightRadio = document.querySelector('input[name="appThemeRadio"][value="light"]');
  const darkRadio = document.querySelector('input[name="appThemeRadio"][value="dark"]');
  if (lightRadio) lightRadio.checked = (theme === "light");
  if (darkRadio) darkRadio.checked = (theme === "dark");

  if (elements.themeOptionLight) elements.themeOptionLight.classList.toggle("active", theme === "light");
  if (elements.themeOptionDark) elements.themeOptionDark.classList.toggle("active", theme === "dark");

  // Re-render Financial Canvas Charts to update axis ticks, tooltips, and gridlines
  if (state.stockData) {
    renderMainChart();
  }
  if (state.predictionData) {
    renderBacktestChart();
  }
}

function openSettingsModal() {
  if (!elements.settingsModal) return;
  const activeRadio = document.querySelector(`input[name="appThemeRadio"][value="${state.theme}"]`);
  if (activeRadio) activeRadio.checked = true;
  if (elements.themeOptionLight) elements.themeOptionLight.classList.toggle("active", state.theme === "light");
  if (elements.themeOptionDark) elements.themeOptionDark.classList.toggle("active", state.theme === "dark");

  if (elements.settingDefaultHorizon) elements.settingDefaultHorizon.value = String(state.horizonDays || 14);
  if (elements.settingVoiceNarration) elements.settingVoiceNarration.checked = Boolean(state.isVoiceNarrationEnabled);

  elements.settingsModal.classList.add("open");
}

function closeSettingsModal() {
  if (elements.settingsModal) {
    elements.settingsModal.classList.remove("open");
  }
}

// ==========================================
// SECURITY & AUTHENTICATION CONTROLLER
// ==========================================

function setupAuth() {
  updateAuthUI();

  // Header Sign In Click
  if (elements.headerSignInBtn) {
    elements.headerSignInBtn.addEventListener("click", () => openAuthModal("signin"));
  }

  // User Profile Pill Click (Toggle Dropdown)
  if (elements.userProfileBtn) {
    elements.userProfileBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (elements.userMenuDropdown) {
        elements.userMenuDropdown.classList.toggle("open");
      }
    });
  }

  // Close User Dropdown on outside click
  document.addEventListener("click", (e) => {
    if (elements.userMenuDropdown && !e.target.closest("#headerUserDropdownWrapper")) {
      elements.userMenuDropdown.classList.remove("open");
    }
  });

  // User Dropdown Settings
  if (elements.menuOpenSettingsBtn) {
    elements.menuOpenSettingsBtn.addEventListener("click", () => {
      if (elements.userMenuDropdown) elements.userMenuDropdown.classList.remove("open");
      openSettingsModal();
    });
  }

  // User Dropdown Sign Out
  if (elements.headerSignOutBtn) {
    elements.headerSignOutBtn.addEventListener("click", () => {
      if (elements.userMenuDropdown) elements.userMenuDropdown.classList.remove("open");
      handleSignOut();
    });
  }

  // Close Auth Modal Buttons
  if (elements.closeAuthModalBtn) {
    elements.closeAuthModalBtn.addEventListener("click", closeAuthModal);
  }
  if (elements.authModal) {
    elements.authModal.addEventListener("click", (e) => {
      if (e.target === elements.authModal) closeAuthModal();
    });
  }

  // Switch Tabs in Auth Modal
  if (elements.authTabSignInBtn) {
    elements.authTabSignInBtn.addEventListener("click", () => switchAuthTab("signin"));
  }
  if (elements.authTabSignUpBtn) {
    elements.authTabSignUpBtn.addEventListener("click", () => switchAuthTab("signup"));
  }
  if (elements.switchToSignUpLink) {
    elements.switchToSignUpLink.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthTab("signup");
    });
  }
  if (elements.switchToSignInLink) {
    elements.switchToSignInLink.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthTab("signin");
    });
  }

  // Password Visibility Toggles
  if (elements.toggleLoginPwBtn && elements.loginPassword) {
    elements.toggleLoginPwBtn.addEventListener("click", () => {
      const isPwd = elements.loginPassword.type === "password";
      elements.loginPassword.type = isPwd ? "text" : "password";
      elements.toggleLoginPwBtn.style.color = isPwd ? "var(--accent-indigo)" : "var(--text-dim)";
    });
  }
  if (elements.toggleRegPwBtn && elements.regPassword) {
    elements.toggleRegPwBtn.addEventListener("click", () => {
      const isPwd = elements.regPassword.type === "password";
      elements.regPassword.type = isPwd ? "text" : "password";
      elements.toggleRegPwBtn.style.color = isPwd ? "var(--accent-indigo)" : "var(--text-dim)";
    });
  }

  // Live Password Strength Meter
  if (elements.regPassword) {
    elements.regPassword.addEventListener("input", (e) => {
      updatePasswordStrength(e.target.value);
    });
  }

  // Sign In Form Submit
  if (elements.signInForm) {
    elements.signInForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const u = elements.loginUsername.value.trim();
      const p = elements.loginPassword.value;
      if (u && p) {
        handleSignIn(u, p);
      }
    });
  }

  // Sign Up Form Submit
  if (elements.signUpForm) {
    elements.signUpForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = elements.regFullName.value.trim();
      const u = elements.regUsername.value.trim();
      const email = elements.regEmail.value.trim();
      const p = elements.regPassword.value;
      if (u && p) {
        handleSignUp(u, p, name, email);
      }
    });
  }
}

async function checkSession() {
  if (!state.authToken) {
    updateAuthUI();
    return;
  }
  try {
    const res = await fetch("/api/auth/me", {
      headers: { "Authorization": `Bearer ${state.authToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      state.currentUser = data.user;
      localStorage.setItem("neuralstock_user", JSON.stringify(data.user));
    } else {
      state.authToken = null;
      state.currentUser = null;
      localStorage.removeItem("neuralstock_token");
      localStorage.removeItem("neuralstock_user");
    }
  } catch (err) {
    console.warn("Session check notice:", err);
  } finally {
    updateAuthUI();
  }
}

function updateAuthUI() {
  const user = state.currentUser;
  if (user) {
    if (elements.headerSignInBtn) elements.headerSignInBtn.style.display = "none";
    if (elements.headerUserDropdownWrapper) elements.headerUserDropdownWrapper.style.display = "block";

    const initial = (user.name || user.username || "U").charAt(0).toUpperCase();
    if (elements.headerUserAvatar) elements.headerUserAvatar.textContent = initial;
    if (elements.headerUserName) elements.headerUserName.textContent = user.name || user.username;
    if (elements.headerUserRole) elements.headerUserRole.textContent = (user.role || "Trader").toUpperCase().split(" ")[0];

    if (elements.dropdownUserName) elements.dropdownUserName.textContent = user.name || user.username;
    if (elements.dropdownUserEmail) elements.dropdownUserEmail.textContent = user.email || `@${user.username}`;
    if (elements.dropdownUserRole) elements.dropdownUserRole.textContent = user.role || "Trader";
  } else {
    if (elements.headerSignInBtn) elements.headerSignInBtn.style.display = "inline-flex";
    if (elements.headerUserDropdownWrapper) elements.headerUserDropdownWrapper.style.display = "none";
  }
}

function openAuthModal(tab = "signin") {
  if (!elements.authModal) return;
  switchAuthTab(tab);
  clearAuthStatus();
  elements.authModal.classList.add("open");
  if (tab === "signin" && elements.loginUsername) {
    elements.loginUsername.focus();
  } else if (tab === "signup" && elements.regFullName) {
    elements.regFullName.focus();
  }
}

function closeAuthModal() {
  if (elements.authModal) {
    elements.authModal.classList.remove("open");
  }
}

function switchAuthTab(tab) {
  if (tab === "signin") {
    if (elements.authTabSignInBtn) elements.authTabSignInBtn.classList.add("active");
    if (elements.authTabSignUpBtn) elements.authTabSignUpBtn.classList.remove("active");
    if (elements.signInForm) elements.signInForm.style.display = "flex";
    if (elements.signUpForm) elements.signUpForm.style.display = "none";
    if (elements.authModalTitle) elements.authModalTitle.textContent = "Sign In to NeuralStock AI";
  } else {
    if (elements.authTabSignInBtn) elements.authTabSignInBtn.classList.remove("active");
    if (elements.authTabSignUpBtn) elements.authTabSignUpBtn.classList.add("active");
    if (elements.signInForm) elements.signInForm.style.display = "none";
    if (elements.signUpForm) elements.signUpForm.style.display = "flex";
    if (elements.authModalTitle) elements.authModalTitle.textContent = "Create Trader Account";
  }
  clearAuthStatus();
}

function showAuthStatus(message, isError = true) {
  if (!elements.authStatusBanner) return;
  elements.authStatusBanner.textContent = message;
  elements.authStatusBanner.className = `auth-status-banner ${isError ? "error" : "success"}`;
  elements.authStatusBanner.style.display = "block";
}

function clearAuthStatus() {
  if (elements.authStatusBanner) {
    elements.authStatusBanner.style.display = "none";
    elements.authStatusBanner.textContent = "";
  }
}

async function handleSignIn(username, password) {
  clearAuthStatus();
  const submitBtn = document.getElementById("submitLoginBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying Credentials...";
  }

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();

    if (!res.ok) {
      showAuthStatus(data.detail || "Authentication failed. Please verify credentials.", true);
      return;
    }

    state.authToken = data.token;
    state.currentUser = data.user;
    localStorage.setItem("neuralstock_token", data.token);
    localStorage.setItem("neuralstock_user", JSON.stringify(data.user));

    updateAuthUI();
    closeAuthModal();
    showToast(`Welcome back, ${data.user.name || data.user.username}! 🚀`);

  } catch (err) {
    showAuthStatus("Network error during login. Please check server status.", true);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Sign In to Dashboard";
    }
  }
}

async function handleSignUp(username, password, name, email) {
  clearAuthStatus();
  const submitBtn = document.getElementById("submitRegisterBtn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating Account...";
  }

  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, name, email })
    });
    const data = await res.json();

    if (!res.ok) {
      showAuthStatus(data.detail || "Registration failed. Please check your inputs.", true);
      return;
    }

    state.authToken = data.token;
    state.currentUser = data.user;
    localStorage.setItem("neuralstock_token", data.token);
    localStorage.setItem("neuralstock_user", JSON.stringify(data.user));

    updateAuthUI();
    closeAuthModal();
    showToast(`Account created! Welcome, ${data.user.name || data.user.username}! 🎉`);

  } catch (err) {
    showAuthStatus("Network error during registration.", true);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account & Sign In";
    }
  }
}

async function handleSignOut() {
  if (state.authToken) {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${state.authToken}` }
      });
    } catch (e) {
      // Ignore network errors on logout
    }
  }

  state.authToken = null;
  state.currentUser = null;
  localStorage.removeItem("neuralstock_token");
  localStorage.removeItem("neuralstock_user");

  updateAuthUI();
  showToast("You have been signed out safely. 👋");
}

function updatePasswordStrength(password) {
  if (!elements.pwStrengthFill || !elements.pwStrengthText) return;
  if (!password) {
    elements.pwStrengthFill.style.width = "0%";
    elements.pwStrengthText.textContent = "Strength: Enter password";
    elements.pwStrengthText.style.color = "var(--text-dim)";
    return;
  }

  let score = 0;
  if (password.length >= 6) score += 25;
  if (password.length >= 10) score += 25;
  if (/[0-9]/.test(password)) score += 20;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;

  elements.pwStrengthFill.style.width = `${Math.min(100, score)}%`;

  if (password.length < 6) {
    elements.pwStrengthFill.style.backgroundColor = "var(--red-glow)";
    elements.pwStrengthText.textContent = "Too Short (Min. 6 chars)";
    elements.pwStrengthText.style.color = "var(--red-glow)";
  } else if (score < 50) {
    elements.pwStrengthFill.style.backgroundColor = "var(--yellow-glow)";
    elements.pwStrengthText.textContent = "Weak — Add numbers & capital letters";
    elements.pwStrengthText.style.color = "var(--yellow-glow)";
  } else if (score < 80) {
    elements.pwStrengthFill.style.backgroundColor = "var(--accent-cyan)";
    elements.pwStrengthText.textContent = "Good — Add special characters for maximum strength";
    elements.pwStrengthText.style.color = "var(--accent-cyan)";
  } else {
    elements.pwStrengthFill.style.backgroundColor = "var(--green-glow)";
    elements.pwStrengthText.textContent = "Strong password! 🛡️";
    elements.pwStrengthText.style.color = "var(--green-glow)";
  }
}

function showToast(message, duration = 3000) {
  const toast = elements.toastNotification;
  toast.textContent = message;
  toast.style.display = "block";
  setTimeout(() => {
    toast.style.display = "none";
  }, duration);
}

function showLoading(msg = "Training AI Ensemble Models & Running Inference...") {
  elements.loadingStatusText.textContent = msg;
  elements.chartLoadingOverlay.classList.add("active");
}

function hideLoading() {
  elements.chartLoadingOverlay.classList.remove("active");
}

// Format Large Numbers (Market Cap)
function formatLargeNumber(num) {
  if (!num || isNaN(num)) return "N/A";
  if (num >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  return `$${num.toLocaleString()}`;
}

// Setup Event Listeners
function setupEventListeners() {
  // Search Input with Debounce
  let searchTimeout = null;
  elements.searchInput.addEventListener("input", (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();
    if (query.length === 0) {
      elements.searchDropdown.style.display = "none";
      return;
    }
    searchTimeout = setTimeout(() => handleSearch(query), 200);
  });

  // Search input Enter key
  elements.searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const query = elements.searchInput.value.trim();
      if (query) {
        elements.searchDropdown.style.display = "none";
        setSymbol(query);
      }
    }
  });

  // Close search dropdown on click outside
  document.addEventListener("click", (e) => {
    if (!elements.searchInput.contains(e.target) && !elements.searchDropdown.contains(e.target)) {
      elements.searchDropdown.style.display = "none";
    }
  });

  // Quick Pick Chips
  document.querySelectorAll("#quickPicksBar .chip-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const sym = btn.dataset.symbol || btn.textContent.trim();
      if (sym && sym !== "Popular:") {
        setSymbol(sym);
      }
    });
  });

  // Timeframe Buttons
  document.querySelectorAll("#timeframeButtons .tf-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#timeframeButtons .tf-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.period = btn.dataset.period;
      loadStockAndPredict(state.symbol, state.period, state.horizonDays);
    });
  });

  // Horizon Slider
  elements.horizonSlider.addEventListener("input", (e) => {
    state.horizonDays = parseInt(e.target.value);
    elements.horizonDaysLabel.textContent = `${state.horizonDays}d`;
  });

  elements.horizonSlider.addEventListener("change", () => {
    loadStockAndPredict(state.symbol, state.period, state.horizonDays);
  });

  // Run AI Forecast button
  elements.runPredictionBtn.addEventListener("click", () => {
    loadStockAndPredict(state.symbol, state.period, state.horizonDays);
  });

  // Overlay Toggles
  elements.toggleSmaBtn.addEventListener("click", () => {
    state.showSma = !state.showSma;
    elements.toggleSmaBtn.classList.toggle("active", state.showSma);
    renderMainChart();
  });

  elements.toggleBbBtn.addEventListener("click", () => {
    state.showBb = !state.showBb;
    elements.toggleBbBtn.classList.toggle("active", state.showBb);
    renderMainChart();
  });

  elements.toggleForecastBtn.addEventListener("click", () => {
    state.showForecast = !state.showForecast;
    elements.toggleForecastBtn.classList.toggle("active", state.showForecast);
    renderMainChart();
  });

  // Tab Switching
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.style.display = "none");

      btn.classList.add("active");
      const targetId = btn.dataset.tab;
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.style.display = "block";
    });
  });

  // Watchlist Add
  elements.addWatchlistBtn.addEventListener("click", () => {
    if (!state.watchlist.includes(state.symbol)) {
      state.watchlist.push(state.symbol);
      localStorage.setItem("neuralstock_watchlist", JSON.stringify(state.watchlist));
      renderWatchlist();
      showToast(`Added ${state.symbol} to your watchlist!`);
    } else {
      showToast(`${state.symbol} is already in your watchlist.`);
    }
  });

  // Chatbot Launcher Toggle
  if (elements.chatbotLauncherBtn) {
    elements.chatbotLauncherBtn.addEventListener("click", () => {
      state.isChatOpen = !state.isChatOpen;
      elements.chatbotWindow.classList.toggle("open", state.isChatOpen);
      if (state.isChatOpen) {
        if (state.chatHistory.length === 0 && elements.chatMessagesList.children.length === 0) {
          renderInitialChatGreeting();
        }
        elements.chatMessageInput.focus();
      }
    });
  }

  // Chatbot Close
  if (elements.chatCloseBtn) {
    elements.chatCloseBtn.addEventListener("click", () => {
      state.isChatOpen = false;
      elements.chatbotWindow.classList.remove("open");
    });
  }

  // Chatbot Clear
  if (elements.chatClearBtn) {
    elements.chatClearBtn.addEventListener("click", () => {
      state.chatHistory = [];
      elements.chatMessagesList.innerHTML = "";
      renderInitialChatGreeting();
    });
  }

  // Chatbot Suggestion Chips
  if (elements.chatSuggestionChips) {
    elements.chatSuggestionChips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chat-chip");
      if (chip && chip.dataset.prompt) {
        sendChatMessage(chip.dataset.prompt);
      }
    });
  }

  // Chatbot Form Submit
  if (elements.chatInputForm) {
    elements.chatInputForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = elements.chatMessageInput.value.trim();
      if (text) {
        elements.chatMessageInput.value = "";
        sendChatMessage(text);
      }
    });
  }

  // Export AI Report
  if (elements.exportReportBtn) {
    elements.exportReportBtn.addEventListener("click", () => {
      exportAIReport();
    });
  }

  // Refresh Screener
  if (elements.refreshScreenerBtn) {
    elements.refreshScreenerBtn.addEventListener("click", () => {
      loadScreenerData();
    });
  }

  // Paper Trading Controls
  if (elements.tradeSharesInput) {
    elements.tradeSharesInput.addEventListener("input", updateTradeEstimatedCost);
  }
  if (elements.buySharesBtn) {
    elements.buySharesBtn.addEventListener("click", executeBuyShares);
  }
  if (elements.sellSharesBtn) {
    elements.sellSharesBtn.addEventListener("click", executeSellShares);
  }
  if (elements.resetPortfolioBtn) {
    elements.resetPortfolioBtn.addEventListener("click", resetPortfolio);
  }

  // Price Alert Controls
  if (elements.createAlertBtn) {
    elements.createAlertBtn.addEventListener("click", createPriceAlert);
  }

  // Voice Narration Toggle
  if (elements.chatVoiceToggleBtn) {
    elements.chatVoiceToggleBtn.addEventListener("click", () => {
      state.isVoiceNarrationEnabled = !state.isVoiceNarrationEnabled;
      elements.chatVoiceToggleBtn.classList.toggle("active", state.isVoiceNarrationEnabled);
      showToast(state.isVoiceNarrationEnabled ? "Voice Speech Narration ON 🔊" : "Voice Speech Narration OFF 🔇");
    });
  }

  // Voice Mic Input
  if (elements.chatMicBtn) {
    elements.chatMicBtn.addEventListener("click", toggleVoiceRecording);
  }

  // Quick Header Theme Segment Buttons
  if (elements.themeLightBtn) {
    elements.themeLightBtn.addEventListener("click", () => {
      applyTheme("light");
      showToast("☀️ Switched to Light Professional Theme");
    });
  }
  if (elements.themeDarkBtn) {
    elements.themeDarkBtn.addEventListener("click", () => {
      applyTheme("dark");
      showToast("🌙 Switched to Dark Cyberpunk Theme");
    });
  }

  // Settings Modal Controls
  if (elements.openSettingsBtn) {
    elements.openSettingsBtn.addEventListener("click", openSettingsModal);
  }
  if (elements.closeSettingsModalBtn) {
    elements.closeSettingsModalBtn.addEventListener("click", closeSettingsModal);
  }
  if (elements.settingsModal) {
    elements.settingsModal.addEventListener("click", (e) => {
      if (e.target === elements.settingsModal) {
        closeSettingsModal();
      }
    });
  }

  // Settings Modal Theme Card Selectors
  if (elements.themeOptionLight) {
    elements.themeOptionLight.addEventListener("click", () => {
      applyTheme("light");
    });
  }
  if (elements.themeOptionDark) {
    elements.themeOptionDark.addEventListener("click", () => {
      applyTheme("dark");
    });
  }

  // Save Settings Button
  if (elements.saveSettingsBtn) {
    elements.saveSettingsBtn.addEventListener("click", () => {
      const selectedRadio = document.querySelector('input[name="appThemeRadio"]:checked');
      if (selectedRadio) {
        applyTheme(selectedRadio.value);
      }
      if (elements.settingDefaultHorizon) {
        const horizon = parseInt(elements.settingDefaultHorizon.value, 10);
        if (!isNaN(horizon) && horizon !== state.horizonDays) {
          state.horizonDays = horizon;
          elements.horizonSlider.value = horizon;
          elements.horizonDaysLabel.textContent = `${horizon}d`;
          loadStockAndPredict(state.symbol, state.period, state.horizonDays);
        }
      }
      if (elements.settingVoiceNarration) {
        state.isVoiceNarrationEnabled = elements.settingVoiceNarration.checked;
        if (elements.chatVoiceToggleBtn) {
          elements.chatVoiceToggleBtn.classList.toggle("active", state.isVoiceNarrationEnabled);
        }
      }
      closeSettingsModal();
      showToast("Settings applied successfully!");
    });
  }

  // Reset Storage / Data in Settings
  if (elements.settingResetStorageBtn) {
    elements.settingResetStorageBtn.addEventListener("click", () => {
      if (confirm("Reset simulated paper portfolio ($100k) and price alerts to initial defaults?")) {
        state.portfolio = {
          cash: 100000.0,
          holdings: { "NVDA": { shares: 15, avgPrice: 195.0 } },
          history: []
        };
        state.alerts = [
          { id: 1, symbol: "NVDA", condition: "above", targetPrice: 215.0, status: "Active" }
        ];
        localStorage.setItem("neuralstock_portfolio", JSON.stringify(state.portfolio));
        localStorage.setItem("neuralstock_alerts", JSON.stringify(state.alerts));
        renderPortfolio();
        renderAlerts();
        closeSettingsModal();
        showToast("Portfolio balance and alerts have been reset to defaults.");
      }
    });
  }
}

function setSymbol(symbol) {
  state.symbol = symbol.toUpperCase();
  if (elements.searchInput) elements.searchInput.value = state.symbol;
  
  // Instant visual feedback on the banner right away!
  if (elements.assetSymbol) elements.assetSymbol.textContent = state.symbol;
  if (elements.assetName) elements.assetName.textContent = `Loading ${state.symbol}...`;
  if (elements.assetPrice) elements.assetPrice.textContent = "Updating...";

  // Highlight quick-pick if exists
  document.querySelectorAll("#quickPicksBar .chip-btn").forEach(b => {
    b.classList.toggle("active", (b.dataset.symbol || b.textContent.trim()) === state.symbol);
  });

  loadStockAndPredict(state.symbol, state.period, state.horizonDays);
}

// Search API Handler
async function handleSearch(query) {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return;
    const items = await res.json();
    renderSearchDropdown(items);
  } catch (err) {
    console.error("Search failed:", err);
  }
}

function renderSearchDropdown(items) {
  if (!items || items.length === 0) {
    elements.searchDropdown.style.display = "none";
    return;
  }

  elements.searchDropdown.innerHTML = items.map(item => `
    <div class="search-item" data-symbol="${item.symbol}">
      <div>
        <span class="search-item-symbol">${item.symbol}</span>
        <span class="search-item-name"> &middot; ${item.name}</span>
      </div>
      <span class="search-item-badge">${item.sector || 'Stock'}</span>
    </div>
  `).join("");

  elements.searchDropdown.style.display = "block";

  elements.searchDropdown.querySelectorAll(".search-item").forEach(el => {
    el.addEventListener("click", () => {
      const sym = el.dataset.symbol;
      elements.searchDropdown.style.display = "none";
      setSymbol(sym);
    });
  });
}

// Main Fetch & Prediction Runner
async function loadStockAndPredict(symbol, period, horizonDays) {
  showLoading(`Fetching ${symbol} data & running AI ensemble models...`);

  try {
    // 1. Fetch full technical historical stock data
    const stockRes = await fetch(`/api/stock/${symbol}?period=${period}`);
    if (!stockRes.ok) {
      throw new Error(`Failed to fetch stock data for ${symbol}`);
    }
    const stockData = await stockRes.json();
    state.stockData = stockData;

    // UPDATE ASSET BANNER IMMEDIATELY! Do not wait for prediction!
    updateAssetBanner(stockData);
    updateTechnicalMatrix(stockData);
    renderMainChart();

    // 2. Fetch AI prediction, forecast trajectory & backtest diagnostics in isolated try/catch
    try {
      const predictRes = await fetch(`/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: symbol,
          period: period,
          horizon_days: horizonDays,
        }),
      });

      if (predictRes.ok) {
        const predictData = await predictRes.json();
        state.predictionData = predictData;
        updateIntelligenceCard(predictData);
        updateDiagnosticsTab(predictData);
        updateRiskLevels(stockData, predictData);
        updateChatbotContext(stockData, predictData);
        renderBacktestChart();
        // Re-render chart with forecast cone overlay
        renderMainChart();
      }
    } catch (predErr) {
      console.warn("Prediction pipeline notice:", predErr);
    }

    // Secondary updates
    loadNewsData(symbol).catch(() => {});
    updateTradePanel(stockData);
    updateAlertPanel(stockData);
    checkPriceAlerts(stockData);

    // Update Market status indicator
    if (stockData.is_live) {
      elements.marketStatusText.textContent = "Live Market Data";
      elements.marketStatusPill.style.color = "#10b981";
      elements.marketStatusPill.style.borderColor = "rgba(16, 185, 129, 0.25)";
    } else {
      elements.marketStatusText.textContent = "Synthetic Simulation";
      elements.marketStatusPill.style.color = "#f59e0b";
      elements.marketStatusPill.style.borderColor = "rgba(245, 158, 11, 0.25)";
    }

  } catch (err) {
    console.error("Pipeline error:", err);
    showToast(`Error: ${err.message}`);
  } finally {
    hideLoading();
  }
}

// Update Hero Asset Banner with dynamic Timeframe & Price changes
function updateAssetBanner(stockData) {
  if (!stockData) return;
  const company = stockData.company || {};
  const latest = stockData.latest_price || {};
  const curr = (company.currency === "INR") ? "₹" : "$";

  if (elements.assetSymbol) elements.assetSymbol.textContent = stockData.symbol;
  if (elements.assetName) elements.assetName.textContent = company.name || stockData.symbol;
  if (elements.assetSector) elements.assetSector.textContent = company.sector || "Equities";
  if (elements.assetExchange) elements.assetExchange.textContent = company.exchange || "Global";
  if (elements.assetMarketCap) elements.assetMarketCap.textContent = `Cap: ${formatLargeNumber(company.market_cap)}`;
  if (elements.assetPE) elements.assetPE.textContent = company.pe_ratio ? `P/E: ${company.pe_ratio.toFixed(1)}` : "P/E: N/A";
  if (elements.assetBeta) elements.assetBeta.textContent = company.beta ? `Beta: ${company.beta.toFixed(2)}` : "Beta: 1.0";
  if (elements.currencySymbol) elements.currencySymbol.textContent = curr;
  if (elements.assetPrice) elements.assetPrice.textContent = latest.close ? latest.close.toFixed(2) : "0.00";

  // 1. Timeframe / Period Return Pill (changes dynamically on 1M, 3M, 6M, 1Y, 2Y, 5Y clicks!)
  const pChange = latest.period_change !== undefined ? latest.period_change : (latest.change || 0);
  const pChangePct = latest.period_change_percent !== undefined ? latest.period_change_percent : (latest.change_percent || 0);
  const isPeriodPos = pChange >= 0;

  if (elements.periodChangePill) {
    elements.periodChangePill.className = `price-change-pill ${isPeriodPos ? "positive" : "negative"}`;
  }
  if (elements.periodChangeArrow) {
    elements.periodChangeArrow.textContent = isPeriodPos ? "▲" : "▼";
  }
  if (elements.periodChangeValue) {
    elements.periodChangeValue.textContent = `${isPeriodPos ? "+" : ""}${curr}${Math.abs(pChange).toFixed(2)} (${isPeriodPos ? "+" : ""}${pChangePct.toFixed(2)}%)`;
  }
  if (elements.periodLabel) {
    elements.periodLabel.textContent = latest.period_label || "Past Year";
  }

  // 2. Today Session Change
  const dayChange = latest.change || 0;
  const dayChangePct = latest.change_percent || 0;
  const isDayPos = dayChange >= 0;
  if (elements.priceChangeValue) {
    elements.priceChangeValue.textContent = `${isDayPos ? "+" : ""}${curr}${Math.abs(dayChange).toFixed(2)} (${isDayPos ? "+" : ""}${dayChangePct.toFixed(2)}%)`;
    elements.priceChangeValue.style.color = isDayPos ? "var(--green-glow)" : "var(--red-glow)";
  }

  // 3. Timeframe High-Low Range
  if (elements.periodRangeText) {
    const pHigh = latest.period_high || latest.close || 0;
    const pLow = latest.period_low || latest.close || 0;
    elements.periodRangeText.textContent = `Range: ${curr}${pLow.toFixed(2)} - ${curr}${pHigh.toFixed(2)}`;
  }
}

// Update AI Intelligence & Rating Card
function updateIntelligenceCard(predictData) {
  const rec = predictData.recommendation || {};
  const curr = (predictData.company && predictData.company.currency === "INR") ? "₹" : "$";

  // Recommendation Badge
  elements.recommendationBadge.textContent = rec.rating || "HOLD";
  elements.recommendationBadge.style.color = rec.rating_color || "#f59e0b";
  elements.recommendationBadge.style.borderColor = rec.rating_color || "#f59e0b";
  elements.recommendationBadge.style.backgroundColor = `${rec.rating_color || "#f59e0b"}20`;

  // Sentiment Meter
  elements.sentimentLabel.textContent = rec.sentiment_label || "Neutral";
  elements.sentimentLabel.style.color = rec.rating_color || "#f59e0b";
  elements.sentimentScorePercent.textContent = `${rec.sentiment_score || 50}% Bullish`;
  elements.sentimentFillBar.style.width = `${rec.sentiment_score || 50}%`;

  // Target Projections
  const forecasts = predictData.forecast || [];
  if (forecasts.length > 0) {
    const f1 = forecasts[0];
    elements.target1dPrice.textContent = `${curr}${f1.predicted_price.toFixed(2)}`;
    elements.target1dChange.textContent = `${f1.expected_change_pct >= 0 ? "+" : ""}${f1.expected_change_pct.toFixed(2)}%`;
    elements.target1dChange.style.color = f1.expected_change_pct >= 0 ? "var(--green-glow)" : "var(--red-glow)";

    const f7 = forecasts[Math.min(6, forecasts.length - 1)];
    elements.target7dPrice.textContent = `${curr}${f7.predicted_price.toFixed(2)}`;
    elements.target7dChange.textContent = `${f7.expected_change_pct >= 0 ? "+" : ""}${f7.expected_change_pct.toFixed(2)}%`;
    elements.target7dChange.style.color = f7.expected_change_pct >= 0 ? "var(--green-glow)" : "var(--red-glow)";

    const f30 = forecasts[forecasts.length - 1];
    elements.target30dPrice.textContent = `${curr}${f30.predicted_price.toFixed(2)}`;
    elements.target30dChange.textContent = `${f30.expected_change_pct >= 0 ? "+" : ""}${f30.expected_change_pct.toFixed(2)}%`;
    elements.target30dChange.style.color = f30.expected_change_pct >= 0 ? "var(--green-glow)" : "var(--red-glow)";
  }

  // Risk Limits
  const risk = rec.risk_levels || {};
  elements.suggestedStopLoss.textContent = risk.stop_loss_suggested ? `${curr}${risk.stop_loss_suggested.toFixed(2)}` : "N/A";
  elements.suggestedTakeProfit.textContent = risk.take_profit_suggested ? `${curr}${risk.take_profit_suggested.toFixed(2)}` : "N/A";

  // AI Key Reasons
  const reasons = rec.key_reasons || [];
  elements.aiKeyInsightsList.innerHTML = reasons.map(r => `
    <div class="insight-item">
      <span class="insight-icon">✦</span>
      <span>${r}</span>
    </div>
  `).join("");
}

// Update Diagnostics Tab (Accuracy, Feature Importance, Metrics)
function updateDiagnosticsTab(predictData) {
  const metrics = predictData.metrics || {};
  elements.metricAccuracy.textContent = `${metrics.directional_accuracy || 0}%`;
  elements.metricMae.textContent = `$${(metrics.mae || 0).toFixed(2)}`;
  elements.metricRmse.textContent = `$${(metrics.rmse || 0).toFixed(2)}`;
  elements.metricR2.textContent = `${(metrics.r2_score || 0).toFixed(3)}`;

  // Feature Importances
  const feats = predictData.feature_importances || [];
  elements.featureImportanceList.innerHTML = feats.map(f => `
    <div class="feat-bar-item">
      <div class="feat-meta">
        <span>${f.feature}</span>
        <span style="color: var(--accent-cyan);">${f.importance}%</span>
      </div>
      <div class="feat-track">
        <div class="feat-bar" style="width: ${Math.min(100, f.importance * 3)}%;"></div>
      </div>
    </div>
  `).join("");
}

// Update Technical Indicators Matrix
function updateTechnicalMatrix(stockData) {
  const hist = stockData.history || [];
  if (hist.length === 0) return;
  const last = hist[hist.length - 1];

  const rsi = last.rsi_14;
  const rsiStatus = rsi > 70 ? "Overbought" : (rsi < 30 ? "Oversold" : "Neutral");
  const rsiBadgeClass = rsi > 70 ? "badge-bearish" : (rsi < 30 ? "badge-bullish" : "badge-neutral");

  const macdHist = last.macd_hist;
  const macdStatus = macdHist > 0 ? "Bullish Crossover" : "Bearish Divergence";
  const macdBadgeClass = macdHist > 0 ? "badge-bullish" : "badge-bearish";

  const bbPos = (last.bb_percent_b * 100).toFixed(1);
  const bbStatus = last.bb_percent_b > 1.0 ? "Upper Band Breakout" : (last.bb_percent_b < 0 ? "Lower Band Breakout" : "Normal Channel");

  const vol = (last.volatility * 100).toFixed(2);
  const volStatus = last.volatility > 0.025 ? "High Volatility" : "Normal Range";

  elements.techIndicatorsGrid.innerHTML = `
    <div class="indicator-tile">
      <div class="tile-header">
        <span>RSI (14-Period)</span>
        <span class="tile-badge ${rsiBadgeClass}">${rsiStatus}</span>
      </div>
      <div class="tile-value">${rsi.toFixed(2)}</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">Overbought &gt;70, Oversold &lt;30</div>
    </div>

    <div class="indicator-tile">
      <div class="tile-header">
        <span>MACD Histogram</span>
        <span class="tile-badge ${macdBadgeClass}">${macdStatus}</span>
      </div>
      <div class="tile-value">${macdHist.toFixed(2)}</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">MACD: ${last.macd.toFixed(2)} &middot; Signal: ${last.macd_signal.toFixed(2)}</div>
    </div>

    <div class="indicator-tile">
      <div class="tile-header">
        <span>Bollinger Bands %B</span>
        <span class="tile-badge badge-neutral">${bbStatus}</span>
      </div>
      <div class="tile-value">${bbPos}%</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">Upper: $${last.bb_upper.toFixed(2)} &middot; Lower: $${last.bb_lower.toFixed(2)}</div>
    </div>

    <div class="indicator-tile">
      <div class="tile-header">
        <span>21-Day Daily Volatility</span>
        <span class="tile-badge badge-neutral">${volStatus}</span>
      </div>
      <div class="tile-value">${vol}%</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">Historical standard deviation of returns</div>
    </div>

    <div class="indicator-tile">
      <div class="tile-header">
        <span>Moving Average 20 / 50</span>
        <span class="tile-badge ${last.close > last.sma_50 ? "badge-bullish" : "badge-bearish"}">
          ${last.close > last.sma_50 ? "Bullish Trend" : "Bearish Trend"}
        </span>
      </div>
      <div class="tile-value">$${last.sma_20.toFixed(2)}</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">SMA 20: $${last.sma_20.toFixed(2)} &middot; SMA 50: $${last.sma_50.toFixed(2)}</div>
    </div>

    <div class="indicator-tile">
      <div class="tile-header">
        <span>Trading Volume</span>
        <span class="tile-badge badge-neutral">Latest Session</span>
      </div>
      <div class="tile-value">${(last.volume / 1e6).toFixed(2)}M</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">Total shares traded in session</div>
    </div>
  `;
}

// Update Support & Resistance Tab
function updateRiskLevels(stockData, predictData) {
  const sr = stockData.support_resistance || {};
  const rec = predictData.recommendation || {};
  const risk = rec.risk_levels || {};

  elements.riskLevelsGrid.innerHTML = `
    <div class="indicator-tile">
      <div class="tile-header">
        <span>Current Market Price</span>
        <span class="tile-badge badge-neutral">Reference</span>
      </div>
      <div class="tile-value">$${(sr.current_price || 0).toFixed(2)}</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">Latest close price</div>
    </div>

    <div class="indicator-tile">
      <div class="tile-header">
        <span>Resistance 1 (Key High)</span>
        <span class="tile-badge badge-bearish">Ceiling</span>
      </div>
      <div class="tile-value" style="color: var(--red-glow);">$${(sr.resistance_1 || 0).toFixed(2)}</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">20-day resistance & pivot barrier</div>
    </div>

    <div class="indicator-tile">
      <div class="tile-header">
        <span>Support 1 (Key Floor)</span>
        <span class="tile-badge badge-bullish">Floor</span>
      </div>
      <div class="tile-value" style="color: var(--green-glow);">$${(sr.support_1 || 0).toFixed(2)}</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">20-day swing low support foundation</div>
    </div>

    <div class="indicator-tile">
      <div class="tile-header">
        <span>Suggested Stop Loss</span>
        <span class="tile-badge badge-bearish">Capital Protection</span>
      </div>
      <div class="tile-value" style="color: var(--red-glow);">$${(risk.stop_loss_suggested || 0).toFixed(2)}</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">Calculated using 2.0x Average True Range</div>
    </div>

    <div class="indicator-tile">
      <div class="tile-header">
        <span>Suggested Take Profit</span>
        <span class="tile-badge badge-bullish">Target Zone</span>
      </div>
      <div class="tile-value" style="color: var(--green-glow);">$${(risk.take_profit_suggested || 0).toFixed(2)}</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">Calculated using 2.5x Average True Range</div>
    </div>

    <div class="indicator-tile">
      <div class="tile-header">
        <span>Pivot Point</span>
        <span class="tile-badge badge-neutral">Equilibrium</span>
      </div>
      <div class="tile-value">$${(sr.pivot_point || 0).toFixed(2)}</div>
      <div style="font-size: 0.75rem; color: var(--text-dim);">Daily classic market equilibrium level</div>
    </div>
  `;
}

// Render Interactive Main Stock & AI Forecast Chart
function renderMainChart() {
  if (!state.stockData) return;
  const history = state.stockData.history || [];
  const forecasts = (state.predictionData && state.predictionData.forecast) || [];

  const labels = history.map(d => d.date);
  const closePrices = history.map(d => d.close);
  const sma20 = history.map(d => d.sma_20);
  const sma50 = history.map(d => d.sma_50);
  const bbUpper = history.map(d => d.bb_upper);
  const bbLower = history.map(d => d.bb_lower);

  // Extend labels with future forecast dates
  const forecastDates = forecasts.map(f => f.date);
  const allLabels = [...labels, ...forecastDates];

  // Align future forecast arrays
  const forecastPrices = Array(history.length - 1).fill(null);
  forecastPrices.push(closePrices[closePrices.length - 1]); // Bridge seamlessly from last historical point
  forecasts.forEach(f => forecastPrices.push(f.predicted_price));

  const upperBand = Array(history.length - 1).fill(null);
  upperBand.push(closePrices[closePrices.length - 1]);
  forecasts.forEach(f => upperBand.push(f.upper_bound));

  const lowerBand = Array(history.length - 1).fill(null);
  lowerBand.push(closePrices[closePrices.length - 1]);
  forecasts.forEach(f => lowerBand.push(f.lower_bound));

  // Visual Theme Colors
  const isLight = (state.theme !== "dark");
  const chartGridColor = isLight ? "rgba(15, 23, 42, 0.07)" : "rgba(255, 255, 255, 0.04)";
  const chartTickColor = isLight ? "#475569" : "#9ca3af";
  const histBorderColor = isLight ? "#0284c7" : "#38bdf8";
  const histBgColor = isLight ? "rgba(2, 132, 199, 0.08)" : "rgba(56, 189, 248, 0.08)";
  const bbBorderColor = isLight ? "rgba(100, 116, 139, 0.35)" : "rgba(156, 163, 175, 0.4)";
  const bbFillColor = isLight ? "rgba(100, 116, 139, 0.04)" : "rgba(156, 163, 175, 0.03)";

  // Build Datasets
  const datasets = [];

  // 1. Historical Close Line
  datasets.push({
    label: "Historical Close",
    data: [...closePrices, ...Array(forecasts.length).fill(null)],
    borderColor: histBorderColor,
    backgroundColor: histBgColor,
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 5,
    tension: 0.1,
    fill: true,
  });

  // 2. SMA Overlays
  if (state.showSma) {
    datasets.push({
      label: "SMA 20",
      data: [...sma20, ...Array(forecasts.length).fill(null)],
      borderColor: "#f59e0b",
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 0,
      fill: false,
    });
    datasets.push({
      label: "SMA 50",
      data: [...sma50, ...Array(forecasts.length).fill(null)],
      borderColor: "#ec4899",
      borderWidth: 1.5,
      pointRadius: 0,
      fill: false,
    });
  }

  // 3. Bollinger Bands
  if (state.showBb) {
    datasets.push({
      label: "BB Upper",
      data: [...bbUpper, ...Array(forecasts.length).fill(null)],
      borderColor: bbBorderColor,
      borderWidth: 1,
      borderDash: [2, 2],
      pointRadius: 0,
      fill: false,
    });
    datasets.push({
      label: "BB Lower",
      data: [...bbLower, ...Array(forecasts.length).fill(null)],
      borderColor: bbBorderColor,
      borderWidth: 1,
      borderDash: [2, 2],
      pointRadius: 0,
      fill: "-1",
      backgroundColor: bbFillColor,
    });
  }

  // 4. AI Forecast & Confidence Cone
  if (state.showForecast && forecasts.length > 0) {
    // Upper confidence bound
    datasets.push({
      label: "95% Upper Bound",
      data: upperBand,
      borderColor: "rgba(6, 182, 212, 0.4)",
      borderWidth: 1,
      borderDash: [3, 3],
      pointRadius: 0,
      fill: false,
    });

    // Lower confidence bound (shaded between upper and lower)
    datasets.push({
      label: "95% Lower Bound",
      data: lowerBand,
      borderColor: "rgba(6, 182, 212, 0.4)",
      borderWidth: 1,
      borderDash: [3, 3],
      pointRadius: 0,
      fill: "-1",
      backgroundColor: "rgba(6, 182, 212, 0.12)",
    });

    // Mean predicted trajectory
    datasets.push({
      label: "AI Ensemble Trajectory",
      data: forecastPrices,
      borderColor: "#06b6d4",
      backgroundColor: "transparent",
      borderWidth: 2.8,
      borderDash: [6, 4],
      pointRadius: (ctx) => (ctx.dataIndex >= history.length - 1 ? 3 : 0),
      pointBackgroundColor: "#06b6d4",
      tension: 0.15,
      fill: false,
    });
  }

  // Destroy previous chart instance if exists
  if (state.mainChart) {
    state.mainChart.destroy();
  }

  const ctx = elements.mainStockChartCanvas.getContext("2d");
  state.mainChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: allLabels,
      datasets: datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isLight ? "rgba(15, 23, 42, 0.95)" : "rgba(15, 23, 42, 0.95)",
          titleColor: "#94a3b8",
          bodyColor: "#f8fafc",
          borderColor: isLight ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.1)",
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: function (context) {
              if (context.parsed.y === null) return null;
              return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            color: chartGridColor,
          },
          ticks: {
            color: chartTickColor,
            maxTicksLimit: 12,
            font: { size: 11 },
          },
        },
        y: {
          grid: {
            color: chartGridColor,
          },
          ticks: {
            color: chartTickColor,
            font: { size: 11 },
            callback: function (val) {
              return `$${val}`;
            },
          },
        },
      },
    },
  });
}

// Render Backtest Diagnostic Chart
function renderBacktestChart() {
  if (!state.predictionData) return;
  const backtest = state.predictionData.backtest || [];
  if (backtest.length === 0) return;

  const dates = backtest.map(b => b.date);
  const actuals = backtest.map(b => b.actual);
  const predicteds = backtest.map(b => b.predicted);

  if (state.backtestChart) {
    state.backtestChart.destroy();
  }

  const isLight = (state.theme !== "dark");
  const btGridColor = isLight ? "rgba(15, 23, 42, 0.07)" : "rgba(255, 255, 255, 0.03)";
  const btTickColor = isLight ? "#475569" : "#6b7280";
  const btLegendColor = isLight ? "#334155" : "#94a3b8";
  const btActualColor = isLight ? "#475569" : "#94a3b8";
  const btPredictedColor = isLight ? "#4f46e5" : "#818cf8";

  const ctx = elements.backtestChartCanvas.getContext("2d");
  state.backtestChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: dates,
      datasets: [
        {
          label: "Actual Market Price",
          data: actuals,
          borderColor: btActualColor,
          borderWidth: 1.8,
          pointRadius: 0,
          fill: false,
        },
        {
          label: "Model Predicted",
          data: predicteds,
          borderColor: btPredictedColor,
          borderWidth: 2,
          borderDash: [4, 3],
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: btLegendColor,
            font: { size: 11 },
          },
        },
      },
      scales: {
        x: {
          grid: { color: btGridColor },
          ticks: { color: btTickColor, maxTicksLimit: 6 },
        },
        y: {
          grid: { color: btGridColor },
          ticks: {
            color: btTickColor,
            callback: function (val) {
              return `$${val}`;
            },
          },
        },
      },
    },
  });
}

// Watchlist Rendering
function renderWatchlist() {
  elements.watchlistContainer.innerHTML = state.watchlist.map(sym => `
    <div class="watchlist-item" data-symbol="${sym}">
      <span style="font-weight: 700; color: var(--text-main);">${sym}</span>
      <span class="remove-watch-btn" data-remove="${sym}" style="color: var(--text-dim); margin-left: 4px; font-size: 0.8rem; cursor: pointer;" title="Remove">&times;</span>
    </div>
  `).join("");

  elements.watchlistContainer.querySelectorAll(".watchlist-item").forEach(item => {
    item.addEventListener("click", (e) => {
      if (e.target.dataset.remove) {
        e.stopPropagation();
        const removeSym = e.target.dataset.remove;
        state.watchlist = state.watchlist.filter(s => s !== removeSym);
        localStorage.setItem("neuralstock_watchlist", JSON.stringify(state.watchlist));
        renderWatchlist();
        return;
      }
      setSymbol(item.dataset.symbol);
    });
  });
}

// ========================================================
// LIVE AI COPILOT CHATBOT CONTROLLER
// ========================================================

function renderInitialChatGreeting() {
  if (!elements.chatMessagesList) return;
  const sym = state.symbol || "NVDA";
  const price = state.stockData?.latest_price?.close ? `$${state.stockData.latest_price.close.toFixed(2)}` : "Live";
  const rating = state.predictionData?.recommendation?.rating || "ANALYZING";

  const greeting = `### 👋 Welcome to NeuralStock Copilot!

I am your real-time **Quantitative AI Financial Analyst**, streaming live market indicators and machine learning ensemble predictions.

**Currently Tracking**: **\`${sym}\`** (${price} &middot; \`${rating}\`)

**What I Can Do For You**:
- 🎯 **Trade Recommendations**: Ask *"Should I buy or sell ${sym}?"*
- 📈 **Price Forecasts**: Ask *"What is the 14-day target for ${sym}?"*
- 🛡️ **Risk Guardrails**: Ask *"Where should I place my stop loss and take profit?"*
- 📊 **Indicator Breakdown**: Ask *"Explain the RSI and MACD for ${sym}"*
- ⚖️ **Asset Comparison**: Ask *"Compare ${sym} vs TSLA"*`;

  appendMessage("assistant", greeting);
}

function updateChatbotContext(stockData, predictData) {
  const sym = stockData.symbol;
  const latest = stockData.latest_price || {};
  const rec = predictData?.recommendation || {};
  const curr = (stockData.company?.currency === "INR") ? "₹" : "$";
  const priceStr = latest.close ? `${curr}${latest.close.toFixed(2)}` : "$0.00";
  const ratingStr = rec.rating || "HOLD";

  if (elements.chatActiveSymbolStatus) {
    elements.chatActiveSymbolStatus.textContent = `Tracking ${sym} · Live Context`;
  }
  if (elements.chatContextTicker) {
    elements.chatContextTicker.textContent = sym;
  }
  if (elements.chatContextQuote) {
    elements.chatContextQuote.textContent = `${priceStr} · ${ratingStr}`;
  }
  if (elements.chatMessageInput) {
    elements.chatMessageInput.placeholder = `Ask about ${sym}, price targets, risk, or compare...`;
  }
}

async function sendChatMessage(userText) {
  if (!userText || state.isBotTyping) return;

  // Append user message immediately
  appendMessage("user", userText);
  state.chatHistory.push({ role: "user", content: userText });

  state.isBotTyping = true;
  if (elements.chatSendBtn) elements.chatSendBtn.disabled = true;
  appendTypingIndicator();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userText,
        symbol: state.symbol,
        history: state.chatHistory.slice(-8),
      }),
    });

    removeTypingIndicator();

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }

    const data = await res.json();
    const reply = data.response || "No response received.";
    appendMessage("assistant", reply);
    state.chatHistory.push({ role: "assistant", content: reply });
    if (state.isVoiceNarrationEnabled) {
      speakText(reply);
    }

  } catch (err) {
    removeTypingIndicator();
    console.error("Chatbot error:", err);
    appendMessage("assistant", `⚠️ **Connection Note**: Unable to generate answer (${err.message}). Please ensure the backend server is running.`);
  } finally {
    state.isBotTyping = false;
    if (elements.chatSendBtn) elements.chatSendBtn.disabled = false;
    if (elements.chatMessageInput) elements.chatMessageInput.focus();
  }
}

function appendMessage(role, text) {
  if (!elements.chatMessagesList) return;
  const msgEl = document.createElement("div");
  msgEl.className = `chat-msg ${role === "user" ? "user" : "bot"}`;

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";

  if (role === "assistant") {
    bubble.className += " bot-markdown";
    bubble.innerHTML = parseMarkdown(text);
  } else {
    bubble.textContent = text;
  }

  msgEl.appendChild(bubble);
  elements.chatMessagesList.appendChild(msgEl);
  elements.chatMessagesList.scrollTop = elements.chatMessagesList.scrollHeight;
}

function appendTypingIndicator() {
  if (!elements.chatMessagesList) return;
  const typingEl = document.createElement("div");
  typingEl.id = "chatTypingIndicator";
  typingEl.className = "chat-msg bot";
  typingEl.innerHTML = `
    <div class="msg-bubble" style="padding: 10px 14px;">
      <div class="typing-dots">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  elements.chatMessagesList.appendChild(typingEl);
  elements.chatMessagesList.scrollTop = elements.chatMessagesList.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById("chatTypingIndicator");
  if (el) el.remove();
}

function parseMarkdown(text) {
  if (!text) return "";
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Headers (### Header)
  html = html.replace(/^### (.*$)/gim, "<h3>$1</h3>");
  html = html.replace(/^## (.*$)/gim, "<h2>$1</h2>");
  html = html.replace(/^# (.*$)/gim, "<h1>$1</h1>");

  // Bold (**bold**)
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Italic (*italic*)
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Inline code (`code`)
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Blockquotes (> quote)
  html = html.replace(/^&gt;\s*(.*$)/gim, "<blockquote>$1</blockquote>");

  // Tables (| ... |)
  const lines = html.split("\n");
  let inTable = false;
  let tableHtml = "";
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (!inTable) {
        inTable = true;
        tableHtml = "<table>";
      }
      if (trimmed.includes("---")) {
        continue;
      }
      const cols = trimmed.split("|").slice(1, -1);
      const isHeader = !tableHtml.includes("<tr>");
      const tag = isHeader ? "th" : "td";
      tableHtml += `<tr>${cols.map(c => `<${tag}>${c.trim()}</${tag}>`).join("")}</tr>`;
    } else {
      if (inTable) {
        inTable = false;
        tableHtml += "</table>";
        newLines.push(tableHtml);
      }
      newLines.push(lines[i]);
    }
  }
  if (inTable) {
    tableHtml += "</table>";
    newLines.push(tableHtml);
  }

  html = newLines.join("\n");

  // Bullet Lists (- item)
  html = html.replace(/^\s*-\s+(.*$)/gim, "<li>$1</li>");
  html = html.replace(/((?:<li>.*<\/li>\s*)+)/gim, "<ul>$1</ul>");

  // Line breaks
  html = html.replace(/\n\n+/g, "<br><br>");
  html = html.replace(/\n/g, "<br>");

  return html;
}

// ========================================================
// 1. LIVE FINANCIAL NEWS & SENTIMENT ENGINE
// ========================================================

async function loadNewsData(symbol) {
  if (!elements.newsArticlesList) return;
  elements.newsArticlesList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem; padding: 12px 0;">Scanning live real-time financial headlines for ${symbol}...</div>`;

  try {
    const res = await fetch(`/api/news/${symbol}`);
    if (!res.ok) throw new Error("Failed to fetch news headlines");
    const data = await res.json();
    state.newsData = data;

    const breakdown = data.sentiment_breakdown || {};
    if (elements.newsOverallLabel) {
      elements.newsOverallLabel.textContent = `${breakdown.overall_label || "Neutral"} (${breakdown.overall_score || 50}%)`;
      elements.newsOverallLabel.style.color = breakdown.overall_color || "#f59e0b";
    }
    if (elements.newsBullishPct) elements.newsBullishPct.textContent = `${breakdown.bullish_pct || 0}%`;
    if (elements.newsNeutralPct) elements.newsNeutralPct.textContent = `${breakdown.neutral_pct || 0}%`;
    if (elements.newsBearishPct) elements.newsBearishPct.textContent = `${breakdown.bearish_pct || 0}%`;

    const articles = data.articles || [];
    if (articles.length === 0) {
      elements.newsArticlesList.innerHTML = `<div style="color: var(--text-dim); font-size: 0.85rem;">No recent news found for ${symbol}.</div>`;
      return;
    }

    elements.newsArticlesList.innerHTML = articles.map(a => `
      <div class="news-card-item">
        <div style="flex: 1;">
          <a href="${a.url}" target="_blank" rel="noopener noreferrer" class="news-title-link">
            ${a.title}
          </a>
          <div class="news-meta-row">
            <span style="color: #94a3b8; font-weight: 600;">${a.source}</span>
            <span>&middot;</span>
            <span>${a.date}</span>
          </div>
        </div>
        <div style="text-align: right; min-width: 110px;">
          <span class="tile-badge" style="background: ${a.color}20; color: ${a.color}; border: 1px solid ${a.color}40; font-size: 0.76rem; padding: 3px 10px;">
            ${a.sentiment}
          </span>
          <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 4px;">${a.confidence}% Confidence</div>
        </div>
      </div>
    `).join("");

  } catch (err) {
    console.error("News load error:", err);
    elements.newsArticlesList.innerHTML = `<div style="color: var(--text-dim); font-size: 0.85rem;">Unable to load news: ${err.message}</div>`;
  }
}

// ========================================================
// 2. AI MARKET SCREENER & HEATMAP
// ========================================================

async function loadScreenerData() {
  if (!elements.screenerTableBody) return;
  elements.screenerTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 24px;">Scanning market leaders with ML ensemble...</td></tr>`;

  try {
    const res = await fetch("/api/screener");
    if (!res.ok) throw new Error("Failed to load screener scan");
    const items = await res.json();
    state.screenerData = items;

    if (!items || items.length === 0) {
      elements.screenerTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 18px;">No screener assets available.</td></tr>`;
      return;
    }

    elements.screenerTableBody.innerHTML = items.map(item => {
      const isPos = item.change >= 0;
      const curr = item.currency === "INR" ? "₹" : "$";
      return `
        <tr>
          <td>
            <div style="font-weight: 700; color: var(--text-main);">${item.symbol}</div>
            <div style="font-size: 0.76rem; color: var(--text-dim);">${item.name}</div>
          </td>
          <td style="font-weight: 700;">${curr}${item.price.toFixed(2)}</td>
          <td style="font-weight: 600; color: ${isPos ? "var(--green-glow)" : "var(--red-glow)"};">
            ${isPos ? "+" : ""}${item.change_percent.toFixed(2)}%
          </td>
          <td>
            <span class="tile-badge" style="background: ${item.rating_color}20; color: ${item.rating_color}; border: 1px solid ${item.rating_color}40;">
              ${item.rating}
            </span>
          </td>
          <td>
            <div style="font-weight: 600; font-size: 0.82rem;">${item.sentiment_score}%</div>
            <div style="width: 60px; height: 4px; background: rgba(255,255,255,0.08); border-radius: 9999px; margin-top: 4px;">
              <div style="width: ${item.sentiment_score}%; height: 100%; background: ${item.rating_color}; border-radius: 9999px;"></div>
            </div>
          </td>
          <td style="font-weight: 600;">${item.rsi}</td>
          <td style="color: ${item.expected_return_pct >= 0 ? "var(--green-glow)" : "var(--red-glow)"}; font-weight: 600;">
            ${curr}${item.target_14d.toFixed(2)} (${item.expected_return_pct >= 0 ? "+" : ""}${item.expected_return_pct}%)
          </td>
          <td>
            <button class="chip-btn" data-screensym="${item.symbol}" style="padding: 3px 10px; font-size: 0.75rem;">
              Analyze
            </button>
          </td>
        </tr>
      `;
    }).join("");

    elements.screenerTableBody.querySelectorAll("button[data-screensym]").forEach(btn => {
      btn.addEventListener("click", () => {
        setSymbol(btn.dataset.screensym);
        // Switch back to AI diagnostics tab
        document.querySelector('.tab-btn[data-tab="tab-backtest"]')?.click();
      });
    });

  } catch (err) {
    console.error("Screener scan error:", err);
    elements.screenerTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 18px;">Scan error: ${err.message}</td></tr>`;
  }
}

// ========================================================
// 3. PAPER TRADING & PORTFOLIO SIMULATOR
// ========================================================

function updateTradePanel(stockData) {
  const sym = stockData.symbol;
  const price = stockData.latest_price?.close || 0;
  const curr = (stockData.company?.currency === "INR") ? "₹" : "$";

  if (elements.tradeSymbolTitle) elements.tradeSymbolTitle.textContent = sym;
  if (elements.tradeLivePrice) elements.tradeLivePrice.textContent = `${curr}${price.toFixed(2)}`;

  updateTradeEstimatedCost();
  renderPortfolio();
}

function updateTradeEstimatedCost() {
  const shares = parseInt(elements.tradeSharesInput?.value || "10") || 0;
  const price = state.stockData?.latest_price?.close || 0;
  const curr = (state.stockData?.company?.currency === "INR") ? "₹" : "$";
  const cost = shares * price;

  if (elements.tradeEstimatedCost) {
    elements.tradeEstimatedCost.textContent = `${curr}${cost.toFixed(2)}`;
  }
}

function renderPortfolio() {
  const p = state.portfolio;
  const curr = (state.stockData?.company?.currency === "INR") ? "₹" : "$";
  let totalPositionValue = 0;
  let totalCostBasis = 0;

  const holdings = p.holdings || {};
  const symbols = Object.keys(holdings);

  const rowsHtml = symbols.map(sym => {
    const item = holdings[sym];
    // Use latest known price if current stock, else buy price as fallback
    const currentPrice = (sym === state.symbol && state.stockData?.latest_price?.close) 
      ? state.stockData.latest_price.close 
      : item.avgPrice;

    const value = item.shares * currentPrice;
    const cost = item.shares * item.avgPrice;
    const pnl = value - cost;
    const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
    const isProfit = pnl >= 0;

    totalPositionValue += value;
    totalCostBasis += cost;

    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-main);">${sym}</td>
        <td>${item.shares}</td>
        <td>${curr}${item.avgPrice.toFixed(2)}</td>
        <td style="font-weight: 600;">${curr}${currentPrice.toFixed(2)}</td>
        <td style="font-weight: 700;">${curr}${value.toFixed(2)}</td>
        <td style="font-weight: 700; color: ${isProfit ? "var(--green-glow)" : "var(--red-glow)"};">
          ${isProfit ? "+" : ""}${curr}${pnl.toFixed(2)} (${isProfit ? "+" : ""}${pnlPct.toFixed(2)}%)
        </td>
        <td>
          <button class="chip-btn" data-sellall="${sym}" style="background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #ef4444; padding: 2px 8px; font-size: 0.72rem;">
            Sell All
          </button>
        </td>
      </tr>
    `;
  }).join("");

  if (elements.portfolioHoldingsBody) {
    elements.portfolioHoldingsBody.innerHTML = rowsHtml || `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 18px;">No open positions yet. Use the Trade Box above to buy shares!</td></tr>`;

    elements.portfolioHoldingsBody.querySelectorAll("button[data-sellall]").forEach(btn => {
      btn.addEventListener("click", () => {
        sellAllHolding(btn.dataset.sellall);
      });
    });
  }

  const netWorth = p.cash + totalPositionValue;
  const totalPnl = totalPositionValue - totalCostBasis;
  const totalPnlPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0;
  const isTotalProfit = totalPnl >= 0;

  if (elements.portfolioNetWorth) elements.portfolioNetWorth.textContent = `${curr}${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (elements.portfolioCash) elements.portfolioCash.textContent = `${curr}${p.cash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (elements.portfolioPnl) {
    elements.portfolioPnl.textContent = `${isTotalProfit ? "+" : ""}${curr}${totalPnl.toFixed(2)}`;
    elements.portfolioPnl.style.color = isTotalProfit ? "var(--green-glow)" : "var(--red-glow)";
  }
  if (elements.portfolioPnlPct) {
    elements.portfolioPnlPct.textContent = `(${isTotalProfit ? "+" : ""}${totalPnlPct.toFixed(2)}%)`;
    elements.portfolioPnlPct.style.color = isTotalProfit ? "var(--green-glow)" : "var(--red-glow)";
  }
  if (elements.portfolioPositionsCount) elements.portfolioPositionsCount.textContent = symbols.length;
}

function executeBuyShares() {
  const sym = state.symbol;
  const price = state.stockData?.latest_price?.close;
  if (!price) {
    showToast("Price data not ready yet.");
    return;
  }
  const shares = parseInt(elements.tradeSharesInput.value);
  if (!shares || shares <= 0) {
    showToast("Please enter a valid positive quantity.");
    return;
  }
  const totalCost = shares * price;
  if (state.portfolio.cash < totalCost) {
    showToast(`Insufficient cash ($${state.portfolio.cash.toFixed(2)}) for total cost ($${totalCost.toFixed(2)}).`);
    return;
  }

  state.portfolio.cash -= totalCost;
  if (!state.portfolio.holdings[sym]) {
    state.portfolio.holdings[sym] = { shares: shares, avgPrice: price };
  } else {
    const existing = state.portfolio.holdings[sym];
    const totalShares = existing.shares + shares;
    const newAvg = ((existing.shares * existing.avgPrice) + (shares * price)) / totalShares;
    existing.shares = totalShares;
    existing.avgPrice = newAvg;
  }

  savePortfolio();
  renderPortfolio();
  showToast(`Bought ${shares} shares of ${sym} at $${price.toFixed(2)}! 🎉`);
}

function executeSellShares() {
  const sym = state.symbol;
  const price = state.stockData?.latest_price?.close;
  if (!price) {
    showToast("Price data not ready yet.");
    return;
  }
  const shares = parseInt(elements.tradeSharesInput.value);
  if (!shares || shares <= 0) {
    showToast("Please enter a valid positive quantity.");
    return;
  }

  const holding = state.portfolio.holdings[sym];
  if (!holding || holding.shares < shares) {
    showToast(`You only own ${holding ? holding.shares : 0} shares of ${sym}.`);
    return;
  }

  const proceeds = shares * price;
  state.portfolio.cash += proceeds;
  holding.shares -= shares;
  if (holding.shares <= 0) {
    delete state.portfolio.holdings[sym];
  }

  savePortfolio();
  renderPortfolio();
  showToast(`Sold ${shares} shares of ${sym} at $${price.toFixed(2)}!`);
}

function sellAllHolding(sym) {
  const holding = state.portfolio.holdings[sym];
  if (!holding) return;
  const price = (sym === state.symbol && state.stockData?.latest_price?.close) 
    ? state.stockData.latest_price.close 
    : holding.avgPrice;

  const proceeds = holding.shares * price;
  state.portfolio.cash += proceeds;
  delete state.portfolio.holdings[sym];

  savePortfolio();
  renderPortfolio();
  showToast(`Liquidated all ${sym} position for proceeds of $${proceeds.toFixed(2)}.`);
}

function resetPortfolio() {
  if (confirm("Reset virtual portfolio back to $100,000.00 cash?")) {
    state.portfolio = {
      cash: 100000.0,
      holdings: {},
      history: []
    };
    savePortfolio();
    renderPortfolio();
    showToast("Portfolio reset to $100,000 cash.");
  }
}

function savePortfolio() {
  localStorage.setItem("neuralstock_portfolio", JSON.stringify(state.portfolio));
}

// ========================================================
// 4. PRICE ALERTS ENGINE
// ========================================================

function updateAlertPanel(stockData) {
  const sym = stockData.symbol;
  const price = stockData.latest_price?.close || 0;
  if (elements.alertSymbolTitle) elements.alertSymbolTitle.textContent = sym;
  if (elements.alertTargetPriceInput && !elements.alertTargetPriceInput.value) {
    elements.alertTargetPriceInput.value = (price * 1.05).toFixed(2);
  }
  renderAlerts();
}

function renderAlerts() {
  if (!elements.alertsTableBody) return;
  const alerts = state.alerts || [];

  if (alerts.length === 0) {
    elements.alertsTableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 18px;">No active price alerts set. Use the form above to add an alert!</td></tr>`;
    return;
  }

  elements.alertsTableBody.innerHTML = alerts.map(a => {
    const isTriggered = a.status === "Triggered";
    return `
      <tr>
        <td style="font-weight: 700; color: var(--text-main);">${a.symbol}</td>
        <td>${a.condition === "above" ? "Price &ge;" : "Price &le;"}</td>
        <td style="font-weight: 700; color: var(--accent-cyan);">$${a.targetPrice.toFixed(2)}</td>
        <td>${a.symbol === state.symbol ? `$${(state.stockData?.latest_price?.close || 0).toFixed(2)}` : "-"}</td>
        <td>
          <span class="tile-badge ${isTriggered ? "badge-bullish" : "badge-neutral"}">
            ${a.status}
          </span>
        </td>
        <td>
          <button class="chip-btn" data-deletealert="${a.id}" style="padding: 2px 8px; font-size: 0.72rem; color: var(--red-glow);">
            Delete
          </button>
        </td>
      </tr>
    `;
  }).join("");

  elements.alertsTableBody.querySelectorAll("button[data-deletealert]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = parseInt(btn.dataset.deletealert);
      state.alerts = state.alerts.filter(a => a.id !== id);
      localStorage.setItem("neuralstock_alerts", JSON.stringify(state.alerts));
      renderAlerts();
      showToast("Alert removed.");
    });
  });
}

function createPriceAlert() {
  const sym = state.symbol;
  const cond = elements.alertConditionSelect.value;
  const target = parseFloat(elements.alertTargetPriceInput.value);

  if (!target || target <= 0) {
    showToast("Please enter a valid price target.");
    return;
  }

  const newAlert = {
    id: Date.now(),
    symbol: sym,
    condition: cond,
    targetPrice: target,
    status: "Active"
  };

  state.alerts.push(newAlert);
  localStorage.setItem("neuralstock_alerts", JSON.stringify(state.alerts));
  renderAlerts();
  showToast(`Alert set: Notify if ${sym} goes ${cond} $${target.toFixed(2)}! 🔔`);
}

function checkPriceAlerts(stockData) {
  const sym = stockData.symbol;
  const currentPrice = stockData.latest_price?.close;
  if (!currentPrice) return;

  state.alerts.forEach(a => {
    if (a.symbol === sym && a.status === "Active") {
      let triggered = false;
      if (a.condition === "above" && currentPrice >= a.targetPrice) triggered = true;
      if (a.condition === "below" && currentPrice <= a.targetPrice) triggered = true;

      if (triggered) {
        a.status = "Triggered";
        localStorage.setItem("neuralstock_alerts", JSON.stringify(state.alerts));
        renderAlerts();
        showToast(`🚨 PRICE ALERT TRIGGERED: ${sym} reached $${currentPrice.toFixed(2)} (${a.condition} target $${a.targetPrice.toFixed(2)})!`, 6000);
      }
    }
  });
}

// ========================================================
// 5. EXPORT AI COMPREHENSIVE REPORT
// ========================================================

function exportAIReport() {
  if (!state.stockData || !state.predictionData) {
    showToast("Analysis data not ready for export.");
    return;
  }

  const sym = state.symbol;
  const comp = state.stockData.company || {};
  const latest = state.stockData.latest_price || {};
  const rec = state.predictionData.recommendation || {};
  const metrics = state.predictionData.metrics || {};
  const risk = rec.risk_levels || {};
  const forecasts = state.predictionData.forecast || [];
  const news = state.newsData?.sentiment_breakdown || {};

  const report = `================================================================
       NEURALSTOCK AI - QUANTITATIVE MARKET REPORT
================================================================
Generated: ${new Date().toLocaleString()}
Asset: ${sym} - ${comp.name || sym}
Sector: ${comp.sector || "Equities"} | Exchange: ${comp.exchange || "Global"}
Current Market Price: $${latest.close?.toFixed(2) || "0.00"} (24h Change: ${latest.change_percent?.toFixed(2) || "0.00"}%)

----------------------------------------------------------------
1. AI ALGORITHMIC CONSENSUS
----------------------------------------------------------------
Rating: ${rec.rating || "HOLD"}
Sentiment Score: ${rec.sentiment_score || 50}% (${rec.sentiment_label || "Neutral"})
Top Reasons:
${(rec.key_reasons || []).map(r => `  * ${r}`).join("\n")}

----------------------------------------------------------------
2. MULTI-HORIZON MACHINE LEARNING PRICE TARGETS
----------------------------------------------------------------
${forecasts.slice(0, 14).map(f => `  Day ${f.step.toString().padStart(2)} (${f.date}): Target $${f.predicted_price.toFixed(2)} (${f.expected_change_pct >= 0 ? "+" : ""}${f.expected_change_pct}%) [Range: $${f.lower_bound} - $${f.upper_bound}]`).join("\n")}

----------------------------------------------------------------
3. RISK MANAGEMENT & EXECUTION PARAMETERS
----------------------------------------------------------------
Suggested Stop-Loss Level:  $${risk.stop_loss_suggested || "N/A"}
Suggested Take-Profit Level: $${risk.take_profit_suggested || "N/A"}
Immediate Support Level:     $${risk.support || "N/A"}
Key Resistance Level:        $${risk.resistance || "N/A"}

----------------------------------------------------------------
4. MODEL BACKTEST & VALIDATION DIAGNOSTICS
----------------------------------------------------------------
Directional Accuracy: ${metrics.directional_accuracy || 0}%
Mean Absolute Error:  $${(metrics.mae || 0).toFixed(2)}
Model R² Score:        ${(metrics.r2_score || 0).toFixed(4)}
Historical Samples:    ${metrics.test_samples || 0} trading sessions

----------------------------------------------------------------
5. LIVE MARKET NEWS SENTIMENT INDEX
----------------------------------------------------------------
Overall Narrative:     ${news.overall_label || "Neutral"} (${news.overall_score || 50}%)
Bullish Headlines:     ${news.bullish_pct || 0}%
Bearish Headlines:     ${news.bearish_pct || 0}%
Neutral Headlines:     ${news.neutral_pct || 0}%

================================================================
Disclaimers: Algorithmic projections generated for research purposes.
Powered by NeuralStock AI Platform.
================================================================`;

  const blob = new Blob([report], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `NeuralStock_${sym}_Intelligence_Report.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Intelligence report for ${sym} downloaded! 📄`);
}

// ========================================================
// 6. VOICE RECOGNITION & SPEECH SYNTHESIS ENGINE
// ========================================================

let recognition = null;

function setupVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    if (elements.chatMicBtn) elements.chatMicBtn.style.display = "none";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";

  recognition.onstart = () => {
    state.isRecordingVoice = true;
    if (elements.chatMicBtn) elements.chatMicBtn.classList.add("recording");
    showToast("Listening... Speak your financial question now 🎙️");
  };

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    if (transcript && elements.chatMessageInput) {
      elements.chatMessageInput.value = transcript;
      sendChatMessage(transcript);
    }
  };

  recognition.onerror = (e) => {
    console.error("Speech recognition error:", e);
    showToast(`Voice input note: ${e.error || "Recognition ended"}`);
  };

  recognition.onend = () => {
    state.isRecordingVoice = false;
    if (elements.chatMicBtn) elements.chatMicBtn.classList.remove("recording");
  };
}

function toggleVoiceRecording() {
  if (!recognition) {
    showToast("Voice recognition is not supported in this browser.");
    return;
  }
  if (state.isRecordingVoice) {
    recognition.stop();
  } else {
    try {
      recognition.start();
    } catch (e) {
      console.error(e);
    }
  }
}

function speakText(rawText) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // Stop any previous speech

  // Strip markdown symbols and tables for clean audio pronunciation
  const cleanText = rawText
    .replace(/[#*`>_~|]/g, "")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.rate = 1.05;
  utterance.pitch = 1.0;
  window.speechSynthesis.speak(utterance);
}

