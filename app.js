/* ============================================================
   EU Financial Planner Landing Page JavaScript
   Latest Release Fetching + Live FIRE Simulator
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initReleaseFetcher();
  initFIRESimulator();
  initAccordion();
});

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

  try {
    const res = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}/releases/latest`);
    if (!res.ok) throw new Error('Failed to fetch from GitHub API');
    
    const data = await res.json();
    const assets = data.assets || [];
    
    // Find the macOS installer asset (.dmg)
    const dmgAsset = assets.find(asset => asset.name.toLowerCase().endsWith('.dmg'));
    
    if (dmgAsset) {
      const downloadUrl = dmgAsset.browser_download_url;
      
      // Update CTAs
      if (downloadBtn) downloadBtn.href = downloadUrl;
      if (navDownloadBtn) navDownloadBtn.href = downloadUrl;
      if (downloadSubtext) {
        downloadSubtext.textContent = `Download latest version: ${data.name || data.tag_name} (macOS)`;
      }
    } else {
      // Fallback if release exists but no DMG is found yet
      if (downloadBtn) downloadBtn.href = fallbackUrl;
      if (navDownloadBtn) navDownloadBtn.href = fallbackUrl;
      if (downloadSubtext) downloadSubtext.textContent = 'View releases on GitHub';
    }
  } catch (error) {
    console.warn('API Error, falling back to release page url:', error);
    if (downloadBtn) downloadBtn.href = fallbackUrl;
    if (navDownloadBtn) navDownloadBtn.href = fallbackUrl;
    if (downloadSubtext) downloadSubtext.textContent = 'View releases on GitHub';
  }
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
    return '€' + Math.round(val).toLocaleString('en-US');
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
    if (fireAgePrecise !== null) {
      const displayAge = Math.ceil(fireAgePrecise);
      statusMessage.classList.remove('warning');
      statusMessage.innerHTML = `🟢 You will reach Full FIRE at age <strong style="margin: 0 4px;">${displayAge}</strong>!`;
    } else {
      statusMessage.classList.add('warning');
      statusMessage.innerHTML = `⚠️ Your savings rates won't cross the Full FIRE line before age 90. Try raising savings or expected returns.`;
    }

    // Update X/Y Axis Labels
    xLabelStart.textContent = currentAge;
    xLabelMid.textContent = Math.round(currentAge + (maxAge - currentAge) / 2);
    xLabelEnd.textContent = maxAge;

    const scaleToLabel = (val) => {
      if (val >= 1000000) return '€' + (val / 1000000).toFixed(1) + 'M';
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
