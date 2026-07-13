/* ============================================================
   EU Financial Planner Landing Page JavaScript
   Latest Release Fetching + Live FIRE Simulator + I18n
   ============================================================ */

let currentLang = 'en';

document.addEventListener('DOMContentLoaded', () => {
  initI18n();
  initReleaseFetcher();
  initFIRESimulator();
  initAccordion();
});

// ============================================================
// 0. I18n Localization Engine
// ============================================================
function initI18n() {
  const savedLang = localStorage.getItem('lang');
  const browserLang = navigator.language || navigator.userLanguage;
  const defaultLang = browserLang.startsWith('it') ? 'it' : 'en';
  currentLang = savedLang || defaultLang;

  updateLangToggleUI();
  applyTranslations();

  const langButtons = document.querySelectorAll('.lang-btn');
  langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedLang = btn.getAttribute('data-lang');
      if (selectedLang !== currentLang) {
        currentLang = selectedLang;
        localStorage.setItem('lang', currentLang);
        updateLangToggleUI();
        applyTranslations();
        
        // Re-run the simulator update so its dynamic status text and format is refreshed
        if (typeof window.calculateProjectionsGlobal === 'function') {
          window.calculateProjectionsGlobal();
        }
        // Re-run the release fetcher so its dynamic text is updated
        if (typeof window.updateReleaseButtonText === 'function') {
          window.updateReleaseButtonText();
        }
      }
    });
  });
}

function updateLangToggleUI() {
  const langButtons = document.querySelectorAll('.lang-btn');
  langButtons.forEach(btn => {
    if (btn.getAttribute('data-lang') === currentLang) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function applyTranslations() {
  const elements = document.querySelectorAll('[data-i18n]');
  const langData = window.translations[currentLang] || window.translations['en'];
  
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (langData[key]) {
      el.innerHTML = langData[key];
    }
  });

  // Update meta tags
  const descriptionMeta = document.querySelector('meta[name="description"]');
  if (descriptionMeta && langData['meta-desc']) {
    descriptionMeta.setAttribute('content', langData['meta-desc']);
  }
  if (langData['meta-title']) {
    document.title = langData['meta-title'];
  }
}

// ============================================================
// 1. GitHub API Release Fetcher
// ============================================================
async function initReleaseFetcher() {
  const downloadBtn = document.getElementById('download-btn');
  const navDownloadBtn = document.getElementById('nav-download-btn');
  const downloadSubtext = document.getElementById('download-subtext');

  const repoOwner = 'vittoriom';
  const repoName = 'finances-app';
  const fallbackUrl = `https://github.com/${repoOwner}/${repoName}/releases/latest`;

  let latestReleaseName = '';
  let useFallback = true;
  let downloadUrl = fallbackUrl;

  // Set initial localized checking text
  const langData = window.translations[currentLang] || window.translations['en'];
  if (downloadSubtext) downloadSubtext.textContent = langData['release-checking'];

  try {
    const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`);
    if (!res.ok) throw new Error('Failed to fetch from GitHub API');
    
    const data = await res.json();
    const assets = data.assets || [];
    
    // Find the macOS installer asset (.dmg)
    const dmgAsset = assets.find(asset => asset.name.toLowerCase().endsWith('.dmg'));
    
    if (dmgAsset) {
      downloadUrl = dmgAsset.browser_download_url;
      latestReleaseName = data.name || data.tag_name;
      useFallback = false;
    }
  } catch (error) {
    console.warn('API Error, falling back to release page url:', error);
  }

  // Update function to be re-run on language switch
  window.updateReleaseButtonText = () => {
    const currentLangData = window.translations[currentLang] || window.translations['en'];
    
    if (downloadBtn) downloadBtn.href = downloadUrl;
    if (navDownloadBtn) navDownloadBtn.href = downloadUrl;
    
    if (downloadSubtext) {
      if (useFallback) {
        downloadSubtext.textContent = currentLangData['release-view-github'];
      } else {
        downloadSubtext.textContent = currentLangData['release-latest'].replace('{version}', latestReleaseName);
      }
    }
  };

  // Run immediately
  window.updateReleaseButtonText();
}

// ============================================================
// 2. Interactive FIRE Simulator
// ============================================================
function initFIRESimulator() {
  // Inputs
  const nwInput = document.getElementById('input-networth');
  const savingsInput = document.getElementById('input-savings');
  const expensesInput = document.getElementById('input-expenses');
  const returnInput = document.getElementById('input-return');
  const ageInput = document.getElementById('input-age');
  const targetAgeInput = document.getElementById('input-targetage');

  // Value Display Elements
  const nwDisplay = document.getElementById('display-networth');
  const savingsDisplay = document.getElementById('display-savings');
  const expensesDisplay = document.getElementById('display-expenses');
  const returnDisplay = document.getElementById('display-return');

  // Result Elements
  const fireTargetDisplay = document.getElementById('val-fire-target');
  const projAgeDisplayLabel = document.getElementById('val-proj-age-label');
  const projNwDisplay = document.getElementById('val-proj-nw');
  const statusMessage = document.getElementById('chart-status-message');
  const fireAchievedAgeLabel = document.getElementById('val-fire-achieved-age');

  // SVG Chart Components
  const chartLine = document.getElementById('chart-line');
  const chartArea = document.getElementById('chart-area');
  const refTargetLine = document.getElementById('ref-target-line');
  const intersectionDot = document.getElementById('chart-intersection-dot');

  const xLabelStart = document.getElementById('x-label-start');
  const xLabelMid = document.getElementById('x-label-mid');
  const xLabelEnd = document.getElementById('x-label-end');
  
  const yLabelMax = document.getElementById('y-label-max');
  const yLabelMid = document.getElementById('y-label-mid');
  const yLabelMin = document.getElementById('y-label-min');

  // Helper formatting function
  const formatCurrency = (val) => {
    const locale = currentLang === 'it' ? 'it-IT' : 'en-US';
    return '€' + Math.round(val).toLocaleString(locale);
  };

  const calculateProjections = () => {
    // Read and parse values
    const currentNetWorth = parseFloat(nwInput.value);
    const monthlySavings = parseFloat(savingsInput.value);
    const targetExpenses = parseFloat(expensesInput.value);
    const expectedReturn = parseFloat(returnInput.value);
    const currentAge = parseInt(ageInput.value) || 30;
    const targetAge = parseInt(targetAgeInput.value) || 55;

    // Boundary check
    if (currentAge >= 90) return;

    // Display updates
    nwDisplay.textContent = formatCurrency(currentNetWorth);
    savingsDisplay.textContent = formatCurrency(monthlySavings);
    expensesDisplay.textContent = formatCurrency(targetExpenses);
    returnDisplay.textContent = expectedReturn + '%';

    const fireTarget = targetExpenses * 25; // 4% rule
    fireTargetDisplay.textContent = formatCurrency(fireTarget);
    projAgeDisplayLabel.textContent = targetAge;

    // Simulation settings
    const maxAge = 90;
    const years = maxAge - currentAge;
    const months = years * 12;
    const monthlyRate = Math.pow(1 + expectedReturn / 100, 1 / 12) - 1;

    let balance = currentNetWorth;
    const dataPoints = [];
    dataPoints.push({ age: currentAge, nw: balance });

    // Run deterministic projection
    for (let m = 1; m <= months; m++) {
      balance = balance * (1 + monthlyRate) + monthlySavings;
      if (m % 12 === 0) {
        const age = currentAge + (m / 12);
        dataPoints.push({ age, nw: balance });
      }
    }

    // Projected NW at selected retirement age
    const targetIndex = Math.min(targetAge - currentAge, dataPoints.length - 1);
    const projectedNw = dataPoints[targetIndex >= 0 ? targetIndex : 0].nw;
    projNwDisplay.textContent = formatCurrency(projectedNw);

    // Calculate Y-scale based on maximum value
    const maxNWVal = Math.max(...dataPoints.map(p => p.nw), fireTarget * 1.25, 100000);
    const minNWVal = 0;

    // Chart dimensions
    const width = 500;
    const height = 240;
    const paddingLeft = 10;
    const paddingRight = 10;
    const paddingTop = 20;
    const paddingBottom = 20;

    const getX = (age) => {
      return paddingLeft + ((age - currentAge) / (maxAge - currentAge)) * (width - paddingLeft - paddingRight);
    };

    const getY = (nw) => {
      return height - paddingBottom - ((nw - minNWVal) / (maxNWVal - minNWVal)) * (height - paddingTop - paddingBottom);
    };

    // Build SVG paths
    let pathD = '';
    let areaD = '';

    dataPoints.forEach((p, idx) => {
      const x = getX(p.age);
      const y = getY(p.nw);

      if (idx === 0) {
        pathD += `M ${x} ${y}`;
        areaD += `M ${x} ${height - paddingBottom} L ${x} ${y}`;
      } else {
        pathD += ` L ${x} ${y}`;
        areaD += ` L ${x} ${y}`;
      }
    });

    areaD += ` L ${getX(maxAge)} ${height - paddingBottom} Z`;

    chartLine.setAttribute('d', pathD);
    chartArea.setAttribute('d', areaD);

    // Position the reference line for FIRE Target
    const targetY = getY(fireTarget);
    refTargetLine.setAttribute('y1', targetY);
    refTargetLine.setAttribute('y2', targetY);

    // Find crossing age
    let fireAgePrecise = null;
    let intersectX = -20;
    let intersectY = -20;

    for (let i = 0; i < dataPoints.length - 1; i++) {
      const p1 = dataPoints[i];
      const p2 = dataPoints[i + 1];
      if (p1.nw <= fireTarget && p2.nw >= fireTarget) {
        const pct = (fireTarget - p1.nw) / (p2.nw - p1.nw);
        fireAgePrecise = p1.age + pct * (p2.age - p1.age);
        intersectX = getX(fireAgePrecise);
        intersectY = getY(fireTarget);
        break;
      }
    }

    // Set intersection dot position
    intersectionDot.setAttribute('cx', intersectX);
    intersectionDot.setAttribute('cy', intersectY);

    // Update Status Alert
    const currentLangData = window.translations[currentLang] || window.translations['en'];
    if (fireAgePrecise !== null) {
      const displayAge = Math.ceil(fireAgePrecise);
      statusMessage.classList.remove('warning');
      statusMessage.innerHTML = currentLangData['sim-status-success'].replace('{age}', displayAge);
    } else {
      statusMessage.classList.add('warning');
      statusMessage.innerHTML = currentLangData['sim-status-fail'];
    }

    // Update X/Y Axis Labels
    xLabelStart.textContent = currentAge;
    xLabelMid.textContent = Math.round(currentAge + (maxAge - currentAge) / 2);
    xLabelEnd.textContent = maxAge;

    const scaleToLabel = (val) => {
      if (val >= 1000000) {
        const formatted = (val / 1000000).toFixed(1);
        return '€' + (currentLang === 'it' ? formatted.replace('.', ',') : formatted) + 'M';
      }
      if (val >= 1000) return '€' + Math.round(val / 1000) + 'k';
      return '€' + val;
    };

    yLabelMax.textContent = scaleToLabel(maxNWVal);
    yLabelMid.textContent = scaleToLabel(maxNWVal / 2);
    yLabelMin.textContent = '€0';
  };

  // Event Listeners for inputs
  const elements = [nwInput, savingsInput, expensesInput, returnInput, ageInput, targetAgeInput];
  elements.forEach(el => {
    if (el) {
      el.addEventListener('input', calculateProjections);
      el.addEventListener('change', calculateProjections);
    }
  });

  // Run initial calculation
  calculateProjections();

  // Export globally to update on language switch
  window.calculateProjectionsGlobal = calculateProjections;
}

// ============================================================
// 3. Interactive Installation Guide Accordion
// ============================================================
function initAccordion() {
  const items = document.querySelectorAll('.accordion-item');

  items.forEach(item => {
    const trigger = item.querySelector('.accordion-trigger');
    if (trigger) {
      trigger.addEventListener('click', () => {
        const isActive = item.classList.contains('active');

        // Close all items
        items.forEach(i => i.classList.remove('active'));

        // Toggle current item
        if (!isActive) {
          item.classList.add('active');
        }
      });
    }
  });
}
