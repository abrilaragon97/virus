/* ════════════════════════════════════════════════════════════════
   VirusSim — app.js
   Motor de simulación SEIR con RK4, red de nodos y visualizaciones
   ════════════════════════════════════════════════════════════════ */

"use strict";

// ══════════════════════════════════════════════════
//  CONSTANTES Y ESTADO GLOBAL
// ══════════════════════════════════════════════════
const PRESETS = {
  wannacry: {
    label: 'WannaCry (2017)',
    N: 15000,
    I0: 1,
    beta: 0.35,
    sigma: 0.50,
    gamma: 0.10,
    delta: 0.012,
    days: 180,
    desc: 'Ransomware WannaCry — Explotó EternalBlue en SMBv1'
  },
  iloveyou: {
    label: 'ILOVEYOU (2000)',
    N: 60000,
    I0: 5,
    beta: 1.80,
    sigma: 0.30,
    gamma: 0.15,
    delta: 0.001,
    days: 60,
    desc: 'Gusano ILOVEYOU — Propagación exponencial por email'
  },
  mydoom: {
    label: 'Mydoom (2004)',
    N: 5000000,
    I0: 10,
    beta: 0.90,
    sigma: 0.40,
    gamma: 0.12,
    delta: 0.003,
    days: 120,
    desc: 'Mydoom — El gusano de email más rápido de la historia'
  },
  custom: {
    label: 'Personalizado',
    N: 10000,
    I0: 1,
    beta: 0.35,
    sigma: 0.20,
    gamma: 0.10,
    delta: 0.005,
    days: 180,
    desc: 'Parámetros personalizados'
  }
};

const TICKER_MSGS = [
  '⚠ WannaCry infectó 200,000 sistemas en 150 países en solo 4 días — Mayo 2017',
  '🔒 ILOVEYOU: 50 millones de equipos comprometidos en menos de 10 días — Mayo 2000',
  '📧 Mydoom: 1 de cada 12 emails en Internet era portador del virus — Enero 2004',
  '💀 El ransomware causó pérdidas globales de más de $20B en 2023',
  '🛡 Una vulnerabilidad sin parchear puede comprometer toda una red en minutos',
  '🌐 El tiempo promedio de detección de una infección es de 197 días',
  '⚡ La velocidad de propagación de WannaCry fue de ~1700 sistemas por hora en su pico',
  '🔑 El kill-switch de WannaCry fue descubierto accidentalmente por un investigador de 22 años',
  '🧬 El modelo SEIR permite predecir el pico de infección con días de anticipación',
  '📊 R₀ > 1 indica que la epidemia se propaga de forma exponencial en la red'
];

let simState = {
  params: { ...PRESETS.wannacry },
  result: null,
  animFrame: 0,
  animTimer: null,
  animSpeed: 1,
  isRunning: false,
  currentPreset: 'wannacry'
};

let networkState = {
  nodes: [],
  edges: [],
  animTimer: null,
  step: 0,
  running: false
};

let charts = {
  main: null,
  delta: null,
  history: null,
  model: null
};

// ══════════════════════════════════════════════════
//  INICIALIZACIÓN
// ══════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initTicker();
  initSliders();
  initTabs();
  renderEquations();
  initHistoryChart();
  loadPreset('wannacry');
  runSimulation();
});

// ══════════════════════════════════════════════════
//  SISTEMA DE PARTÍCULAS (FONDO)
// ══════════════════════════════════════════════════
function initParticles() {
  const canvas = document.getElementById('particleCanvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function Particle() {
    this.x = Math.random() * W;
    this.y = Math.random() * H;
    this.vx = (Math.random() - 0.5) * 0.4;
    this.vy = (Math.random() - 0.5) * 0.4;
    this.radius = Math.random() * 1.5 + 0.5;
    this.alpha = Math.random() * 0.5 + 0.2;
    this.color = Math.random() < 0.6
      ? `rgba(255,60,110,${this.alpha})`
      : `rgba(34,211,238,${this.alpha * 0.6})`;
    this.pulse = 0;
    this.pulseSpeed = Math.random() * 0.02 + 0.005;
  }

  function initParticlesArr() {
    particles = [];
    for (let i = 0; i < 120; i++) particles.push(new Particle());
  }

  function drawConnections() {
    const MAX_DIST = 100;
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const alpha = (1 - dist / MAX_DIST) * 0.15;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255,60,110,${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    drawConnections();
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += p.pulseSpeed;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
      const r = p.radius * (1 + 0.3 * Math.sin(p.pulse));
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    });
    requestAnimationFrame(animate);
  }

  resize();
  initParticlesArr();
  animate();
  window.addEventListener('resize', () => { resize(); initParticlesArr(); });
}

// ══════════════════════════════════════════════════
//  TICKER DE ALERTAS
// ══════════════════════════════════════════════════
function initTicker() {
  let idx = 0;
  const el = document.getElementById('tickerText');
  setInterval(() => {
    idx = (idx + 1) % TICKER_MSGS.length;
    el.style.animation = 'none';
    el.textContent = TICKER_MSGS[idx];
    void el.offsetWidth; // reflow
    el.style.animation = 'tickerScroll 30s linear infinite';
  }, 30000);
  el.textContent = TICKER_MSGS[0];
}

// ══════════════════════════════════════════════════
//  TABS
// ══════════════════════════════════════════════════
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + target).classList.add('active');

      if (target === 'model' && charts.model && simState.result) {
        updateModelChart();
      }
    });
  });
}

// ══════════════════════════════════════════════════
//  SLIDERS
// ══════════════════════════════════════════════════
function initSliders() {
  const sliders = [
    ['slN', 'valN', v => v.toLocaleString()],
    ['slI0', 'valI0', v => v],
    ['slBeta', 'valBeta', v => (+v).toFixed(2)],
    ['slSigma', 'valSigma', v => (+v).toFixed(2)],
    ['slGamma', 'valGamma', v => (+v).toFixed(2)],
    ['slDelta', 'valDelta', v => (+v).toFixed(3)],
    ['slDays', 'valDays', v => v],
  ];

  sliders.forEach(([id, valId, fmt]) => {
    const sl = document.getElementById(id);
    const vl = document.getElementById(valId);
    sl.addEventListener('input', () => {
      vl.textContent = fmt(sl.value);
      updateR0();
      // Mark as custom if not dragging a preset
      if (['slBeta', 'slGamma', 'slSigma', 'slDelta'].includes(id)) {
        // lightweight update
      }
    });
  });
  updateR0();
}

function updateR0() {
  const beta = +document.getElementById('slBeta').value;
  const gamma = +document.getElementById('slGamma').value;
  const delta = +document.getElementById('slDelta').value;
  const R0 = beta / (gamma + delta);
  document.getElementById('r0val').textContent = R0.toFixed(2);
  const pct = Math.min(R0 / 15, 1) * 100;
  document.getElementById('r0bar').style.width = pct + '%';
}

// ══════════════════════════════════════════════════
//  PRESETS
// ══════════════════════════════════════════════════
function loadPreset(name) {
  const p = PRESETS[name] || PRESETS.custom;
  simState.currentPreset = name;

  document.getElementById('slN').value = p.N;
  document.getElementById('valN').textContent = p.N.toLocaleString();
  document.getElementById('slI0').value = p.I0;
  document.getElementById('valI0').textContent = p.I0;
  document.getElementById('slBeta').value = p.beta;
  document.getElementById('valBeta').textContent = p.beta.toFixed(2);
  document.getElementById('slSigma').value = p.sigma;
  document.getElementById('valSigma').textContent = p.sigma.toFixed(2);
  document.getElementById('slGamma').value = p.gamma;
  document.getElementById('valGamma').textContent = p.gamma.toFixed(2);
  document.getElementById('slDelta').value = p.delta;
  document.getElementById('valDelta').textContent = p.delta.toFixed(3);
  document.getElementById('slDays').value = p.days;
  document.getElementById('valDays').textContent = p.days;

  // Highlight preset button
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('preset' + name.charAt(0).toUpperCase() + name.slice(1));
  if (btn) btn.classList.add('active');

  updateR0();
}

function loadPresetAndSwitch(name) {
  loadPreset(name);
  // Switch to simulation tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('btn-simulation').classList.add('active');
  document.getElementById('tab-simulation').classList.add('active');
  runSimulation();
}

// ══════════════════════════════════════════════════
//  MODELO SEIR — ECUACIONES DIFERENCIALES
// ══════════════════════════════════════════════════
function seir(t, y, params) {
  const { N, beta, sigma, gamma, delta } = params;
  const [S, E, I, R, D] = y;

  const dSdt = -beta * S * I / N;
  const dEdt = beta * S * I / N - sigma * E;
  const dIdt = sigma * E - gamma * I - delta * I;
  const dRdt = gamma * I;
  const dDdt = delta * I;

  return [dSdt, dEdt, dIdt, dRdt, dDdt];
}

// Runge-Kutta 4to orden
function rk4Step(t, y, h, params) {
  const f = (tt, yy) => seir(tt, yy, params);

  const k1 = f(t, y);
  const k2 = f(t + h / 2, y.map((yi, i) => yi + h * k1[i] / 2));
  const k3 = f(t + h / 2, y.map((yi, i) => yi + h * k2[i] / 2));
  const k4 = f(t + h, y.map((yi, i) => yi + h * k3[i]));

  return y.map((yi, i) => yi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

function solveSEIR(params) {
  const { N, I0, beta, sigma, gamma, delta, days } = params;
  const h = 1; // paso diario
  const steps = days;

  const S0 = N - I0;
  const E0 = 0;
  const R0val = 0;
  const D0 = 0;

  let y = [S0, E0, I0, R0val, D0];

  const result = {
    t: [],
    S: [], E: [], I: [], R: [], D: [],
    newInfected: [],
    params,
    steps
  };

  let prevI = I0;

  for (let step = 0; step <= steps; step++) {
    result.t.push(step);
    result.S.push(y[0]);
    result.E.push(y[1]);
    result.I.push(y[2]);
    result.R.push(y[3]);
    result.D.push(y[4]);

    const newInf = Math.max(0, prevI > 0 ? (beta * y[0] * y[2] / N) : 0);
    result.newInfected.push(newInf);
    prevI = y[2];

    if (step < steps) {
      y = rk4Step(step, y, h, params);
      // Ensure non-negative
      y = y.map(v => Math.max(0, v));
    }
  }

  return result;
}

// ══════════════════════════════════════════════════
//  SIMULACIÓN PRINCIPAL
// ══════════════════════════════════════════════════
function runSimulation() {
  const params = {
    N: +document.getElementById('slN').value,
    I0: +document.getElementById('slI0').value,
    beta: +document.getElementById('slBeta').value,
    sigma: +document.getElementById('slSigma').value,
    gamma: +document.getElementById('slGamma').value,
    delta: +document.getElementById('slDelta').value,
    days: +document.getElementById('slDays').value
  };

  const t0 = performance.now();
  const result = solveSEIR(params);
  const elapsed = (performance.now() - t0).toFixed(2);

  simState.result = result;
  simState.animFrame = 0;

  // Update solver info on model tab
  document.getElementById('rk4Steps').textContent = result.steps;
  document.getElementById('rk4Time').textContent = elapsed + ' ms';

  // Show peak info
  const peakIdx = result.I.indexOf(Math.max(...result.I));
  const peakMax = Math.round(result.I[peakIdx]);
  const totalDead = Math.round(result.D[result.D.length - 1]);
  const totalRecov = Math.round(result.R[result.R.length - 1]);
  const pctImmune = ((totalRecov / params.N) * 100).toFixed(1);

  document.getElementById('peakDay').textContent = 'Día ' + peakIdx;
  document.getElementById('peakMax').textContent = peakMax.toLocaleString();
  document.getElementById('totalDead').textContent = totalDead.toLocaleString();
  document.getElementById('pctImmune').textContent = pctImmune + '%';
  document.getElementById('peakInfo').style.display = 'grid';

  // Stop previous animation
  if (simState.animTimer) clearTimeout(simState.animTimer);
  simState.isRunning = true;

  animateSimulation();
  updateModelChart();
}

function animateSimulation() {
  if (!simState.result) return;

  const result = simState.result;
  const totalFrames = result.t.length;
  const frame = simState.animFrame;

  if (frame > totalFrames - 1) {
    simState.isRunning = false;
    // Show final state
    updateMetrics(result, totalFrames - 1);
    return;
  }

  // Progressive chart update every few frames for smooth animation
  const batchSize = Math.max(1, Math.floor(totalFrames / 120));
  const endFrame = Math.min(frame + batchSize, totalFrames);

  updateMetrics(result, endFrame - 1);
  renderMainChart(result, endFrame);

  document.getElementById('currentDay').textContent = endFrame - 1;

  simState.animFrame = endFrame;

  const delay = Math.round(16 / simState.animSpeed);
  simState.animTimer = setTimeout(animateSimulation, delay);
}

function updateMetrics(result, idx) {
  const N = result.params.N;
  const S = Math.round(result.S[idx]);
  const E = Math.round(result.E[idx]);
  const I = Math.round(result.I[idx]);
  const R = Math.round(result.R[idx]);

  document.getElementById('metS').textContent = S.toLocaleString();
  document.getElementById('metE').textContent = E.toLocaleString();
  document.getElementById('metI').textContent = I.toLocaleString();
  document.getElementById('metR').textContent = R.toLocaleString();

  document.getElementById('fillS').style.width = (S / N * 100) + '%';
  document.getElementById('fillE').style.width = (E / N * 100) + '%';
  document.getElementById('fillI').style.width = (I / N * 100) + '%';
  document.getElementById('fillR').style.width = (R / N * 100) + '%';

  // Conservation bar on model tab
  const D = Math.round(result.D[idx]);
  document.getElementById('consS').style.width = (S / N * 100).toFixed(1) + '%';
  document.getElementById('consE').style.width = (E / N * 100).toFixed(1) + '%';
  document.getElementById('consI').style.width = (I / N * 100).toFixed(1) + '%';
  document.getElementById('consR').style.width = (R / N * 100).toFixed(1) + '%';
  document.getElementById('consD').style.width = (D / N * 100).toFixed(1) + '%';
}

function renderMainChart(result, upToFrame) {
  const labels = result.t.slice(0, upToFrame);
  const S = result.S.slice(0, upToFrame);
  const E = result.E.slice(0, upToFrame);
  const I = result.I.slice(0, upToFrame);
  const R = result.R.slice(0, upToFrame);
  const D = result.D.slice(0, upToFrame);
  const newInf = result.newInfected.slice(0, upToFrame);

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10,14,26,0.95)',
        borderColor: 'rgba(255,60,110,0.3)',
        borderWidth: 1,
        titleColor: '#f0f4ff',
        bodyColor: '#8899bb',
        padding: 10,
        callbacks: {
          label: ctx => ` ${ctx.dataset.label}: ${Math.round(ctx.raw).toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#4a5578', font: { family: 'JetBrains Mono', size: 10 }, maxTicksLimit: 10 },
        title: { display: true, text: 'Días', color: '#4a5578', font: { size: 11 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#4a5578', font: { family: 'JetBrains Mono', size: 10 }, callback: v => v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v },
        title: { display: true, text: 'Equipos', color: '#4a5578', font: { size: 11 } }
      }
    }
  };

  const makeDataset = (label, data, color, fill = false) => ({
    label,
    data,
    borderColor: color,
    backgroundColor: fill ? color.replace(')', ',0.08)').replace('rgb', 'rgba').replace('rgba(rgba', 'rgba') : 'transparent',
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.4,
    fill
  });

  const colorMap = {
    S: '#4ade80', E: '#facc15', I: '#ff3c6e', R: '#60a5fa', D: '#c084fc'
  };

  if (!charts.main) {
    const ctx = document.getElementById('mainChart').getContext('2d');
    charts.main = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          makeDataset('Susceptibles', S, colorMap.S, true),
          makeDataset('Expuestos', E, colorMap.E, true),
          makeDataset('Infectados', I, colorMap.I, true),
          makeDataset('Recuperados', R, colorMap.R, true),
          makeDataset('Caídos', D, colorMap.D, true)
        ]
      },
      options: commonOptions
    });
  } else {
    charts.main.data.labels = labels;
    charts.main.data.datasets[0].data = S;
    charts.main.data.datasets[1].data = E;
    charts.main.data.datasets[2].data = I;
    charts.main.data.datasets[3].data = R;
    charts.main.data.datasets[4].data = D;
    charts.main.update('none');
  }

  // Delta chart
  if (!charts.delta) {
    const ctx2 = document.getElementById('deltaChart').getContext('2d');
    charts.delta = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Nuevas infecciones/día',
          data: newInf,
          backgroundColor: 'rgba(255,60,110,0.6)',
          borderColor: '#ff3c6e',
          borderWidth: 1,
          borderRadius: 2
        }]
      },
      options: {
        ...commonOptions,
        scales: {
          ...commonOptions.scales,
          y: {
            ...commonOptions.scales.y,
            title: { display: true, text: 'Nuevas infecciones', color: '#4a5578', font: { size: 11 } }
          }
        }
      }
    });
  } else {
    charts.delta.data.labels = labels;
    charts.delta.data.datasets[0].data = newInf;
    charts.delta.update('none');
  }
}

function resetSimulation() {
  if (simState.animTimer) clearTimeout(simState.animTimer);
  simState.result = null;
  simState.animFrame = 0;
  simState.isRunning = false;

  if (charts.main) { charts.main.destroy(); charts.main = null; }
  if (charts.delta) { charts.delta.destroy(); charts.delta = null; }

  document.getElementById('metS').textContent = '0';
  document.getElementById('metE').textContent = '0';
  document.getElementById('metI').textContent = '0';
  document.getElementById('metR').textContent = '0';
  document.getElementById('currentDay').textContent = '0';
  document.getElementById('peakInfo').style.display = 'none';
}

function setSpeed(s) {
  simState.animSpeed = s;
  document.querySelectorAll('.speed-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === `×${s}`);
  });
}

// ══════════════════════════════════════════════════
//  CHART DEL MODELO (TAB DE ECUACIONES)
// ══════════════════════════════════════════════════
function updateModelChart() {
  if (!simState.result) return;
  const result = simState.result;

  const chartData = {
    labels: result.t,
    datasets: [
      { label: 'S(t)', data: result.S, borderColor: '#4ade80', borderWidth: 2, pointRadius: 0, tension: 0.4 },
      { label: 'E(t)', data: result.E, borderColor: '#facc15', borderWidth: 2, pointRadius: 0, tension: 0.4 },
      { label: 'I(t)', data: result.I, borderColor: '#ff3c6e', borderWidth: 2.5, pointRadius: 0, tension: 0.4 },
      { label: 'R(t)', data: result.R, borderColor: '#60a5fa', borderWidth: 2, pointRadius: 0, tension: 0.4 },
      { label: 'D(t)', data: result.D, borderColor: '#c084fc', borderWidth: 1.5, pointRadius: 0, tension: 0.4, borderDash: [4, 4] }
    ]
  };

  const opts = {
    responsive: true,
    maintainAspectRatio: true,
    animation: { duration: 600 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        labels: { color: '#8899bb', font: { family: 'JetBrains Mono', size: 11 }, padding: 15, pointStyle: 'line', usePointStyle: true }
      },
      tooltip: {
        backgroundColor: 'rgba(10,14,26,0.95)',
        borderColor: 'rgba(255,60,110,0.3)',
        borderWidth: 1,
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${Math.round(ctx.raw).toLocaleString()}` }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#4a5578', maxTicksLimit: 12, font: { family: 'JetBrains Mono', size: 10 } },
        title: { display: true, text: 't (días)', color: '#8899bb', font: { size: 12 } }
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#4a5578', font: { family: 'JetBrains Mono', size: 10 }, callback: v => v >= 1000000 ? (v / 1000000).toFixed(1) + 'M' : v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v },
        title: { display: true, text: 'Número de equipos', color: '#8899bb', font: { size: 12 } }
      }
    }
  };

  if (!charts.model) {
    const ctx = document.getElementById('modelChart').getContext('2d');
    charts.model = new Chart(ctx, { type: 'line', data: chartData, options: opts });
  } else {
    charts.model.data = chartData;
    charts.model.update();
  }
}

// ══════════════════════════════════════════════════
//  GRÁFICA HISTÓRICA
// ══════════════════════════════════════════════════
function initHistoryChart() {
  // Historical estimated data points (normalized, not actual scale)
  const wc_days = [0, 1, 2, 3, 4, 7, 10, 14, 21, 30, 60, 90];
  const wc_data = [1, 800, 15000, 80000, 150000, 185000, 198000, 200000, 202000, 203000, 205000, 205000];

  const ily_days = [0, 1, 2, 3, 5, 7, 10, 15, 20, 30];
  const ily_data = [5, 500000, 2000000, 10000000, 30000000, 45000000, 52000000, 55000000, 56000000, 56500000];

  // Solve SEIR for WannaCry historical
  const wcParams = { ...PRESETS.wannacry, N: 205000 };
  const wcResult = solveSEIR(wcParams);

  const ctx = document.getElementById('historyChart').getContext('2d');
  charts.history = new Chart(ctx, {
    type: 'line',
    data: {
      datasets: [
        {
          label: 'WannaCry — Datos históricos',
          data: wc_days.map((d, i) => ({ x: d, y: wc_data[i] })),
          borderColor: '#ff3c6e',
          backgroundColor: 'rgba(255,60,110,0.2)',
          pointRadius: 6,
          pointStyle: 'circle',
          showLine: false,
          tension: 0
        },
        {
          label: 'WannaCry — Modelo SEIR',
          data: wcResult.t.map((t, i) => ({ x: t, y: wcResult.S[0] - wcResult.S[i] + wcResult.I[i] })),
          borderColor: '#ff3c6e',
          borderDash: [5, 3],
          pointRadius: 0,
          borderWidth: 2,
          tension: 0.4
        },
        {
          label: 'ILOVEYOU — Datos históricos',
          data: ily_days.map((d, i) => ({ x: d, y: ily_data[i] })),
          borderColor: '#facc15',
          backgroundColor: 'rgba(250,204,21,0.2)',
          pointRadius: 6,
          pointStyle: 'triangle',
          showLine: false,
          yAxisID: 'y2'
        },
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: 'point' },
      plugins: {
        legend: {
          display: true,
          labels: { color: '#8899bb', font: { size: 11 }, padding: 12, usePointStyle: true }
        },
        tooltip: {
          backgroundColor: 'rgba(10,14,26,0.95)',
          borderColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${Math.round(ctx.parsed.y).toLocaleString()} sistemas`
          }
        }
      },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'Días desde el inicio', color: '#8899bb' },
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#4a5578', font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          position: 'left',
          title: { display: true, text: 'WannaCry (sistemas)', color: '#ff3c6e' },
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#ff3c6e', font: { family: 'JetBrains Mono', size: 10 }, callback: v => (v / 1000).toFixed(0) + 'K' }
        },
        y2: {
          position: 'right',
          title: { display: true, text: 'ILOVEYOU (sistemas)', color: '#facc15' },
          grid: { display: false },
          ticks: { color: '#facc15', font: { family: 'JetBrains Mono', size: 10 }, callback: v => (v / 1000000).toFixed(0) + 'M' }
        }
      }
    }
  });
}

function selectHistoricVirus(name) {
  // Visual feedback
  document.querySelectorAll('.timeline-item').forEach(el => el.style.opacity = '0.5');
  document.querySelector(`.timeline-item.${name}`).style.opacity = '1';
}

// ══════════════════════════════════════════════════
//  RED DE NODOS — VISUALIZACIÓN
// ══════════════════════════════════════════════════
const NODE_STATES = { S: 0, E: 1, I: 2, R: 3, D: 4 };
const NODE_COLORS = {
  0: '#4ade80',
  1: '#facc15',
  2: '#ff3c6e',
  3: '#60a5fa',
  4: '#6b7280'
};

function startNetworkSim() {
  document.getElementById('networkOverlay').style.opacity = '0';
  setTimeout(() => {
    document.getElementById('networkOverlay').style.display = 'none';
  }, 400);

  if (networkState.animTimer) clearInterval(networkState.animTimer);

  const nNodes = +document.getElementById('slNodes').value;
  const speed = +document.getElementById('slNetSpeed').value;

  initNetwork(nNodes);
  networkState.running = true;
  networkState.step = 0;

  const interval = Math.round(600 / speed);
  networkState.animTimer = setInterval(() => {
    stepNetwork();
    drawNetwork();
    updateNetworkStats();
    networkState.step++;

    // Stop when no more infected
    if (networkState.nodes.every(n => n.state !== NODE_STATES.I && n.state !== NODE_STATES.E)) {
      clearInterval(networkState.animTimer);
      networkState.running = false;
    }
  }, interval);

  drawNetwork();
}

function initNetwork(n) {
  const canvas = document.getElementById('networkCanvas');
  const W = canvas.offsetWidth;
  const H = canvas.offsetHeight;
  canvas.width = W;
  canvas.height = H;

  networkState.nodes = [];
  networkState.edges = [];
  networkState.step = 0;

  // Create nodes (random positions avoiding clusters)
  for (let i = 0; i < n; i++) {
    networkState.nodes.push({
      id: i,
      x: 40 + Math.random() * (W - 80),
      y: 40 + Math.random() * (H - 80),
      state: NODE_STATES.S,
      incubationTimer: 0,
      infectedTimer: 0,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 6 + Math.random() * 4,
      pulse: Math.random() * Math.PI * 2
    });
  }

  // Infect patient zero
  networkState.nodes[0].state = NODE_STATES.I;
  networkState.nodes[0].infectedTimer = 0;

  // Create edges (Barabási–Albert style — preferential attachment simplified)
  const m = 3; // connections per node
  networkState.edges = [];
  for (let i = m; i < n; i++) {
    const targets = new Set();
    while (targets.size < Math.min(m, i)) {
      const j = Math.floor(Math.random() * i);
      targets.add(j);
    }
    targets.forEach(j => {
      networkState.edges.push([i, j]);
    });
  }
  // Add some random short-distance edges
  for (let k = 0; k < n; k++) {
    for (let l = k + 1; l < n; l++) {
      const dx = networkState.nodes[k].x - networkState.nodes[l].x;
      const dy = networkState.nodes[k].y - networkState.nodes[l].y;
      if (Math.sqrt(dx * dx + dy * dy) < 80) {
        if (Math.random() < 0.25) {
          networkState.edges.push([k, l]);
        }
      }
    }
  }
}

function stepNetwork() {
  const beta = +document.getElementById('slBeta').value;
  const sigma = +document.getElementById('slSigma').value;
  const gamma = +document.getElementById('slGamma').value;
  const delta = +document.getElementById('slDelta').value;
  const dt = 0.1;

  const edgeMap = buildEdgeMap();

  networkState.nodes.forEach(node => {
    if (node.state === NODE_STATES.S) {
      const neighbors = edgeMap[node.id] || [];
      const infectedNeighbors = neighbors.filter(j => networkState.nodes[j].state === NODE_STATES.I).length;
      const p = 1 - Math.pow(1 - beta * dt, infectedNeighbors);
      if (Math.random() < p) {
        node.state = NODE_STATES.E;
        node.incubationTimer = 0;
      }
    } else if (node.state === NODE_STATES.E) {
      node.incubationTimer += dt;
      if (Math.random() < sigma * dt) {
        node.state = NODE_STATES.I;
        node.infectedTimer = 0;
      }
    } else if (node.state === NODE_STATES.I) {
      node.infectedTimer += dt;
      node.pulse += 0.15;
      if (Math.random() < gamma * dt) {
        node.state = NODE_STATES.R;
      } else if (Math.random() < delta * dt) {
        node.state = NODE_STATES.D;
      }
    }
  });

  // Subtle node movement
  const canvas = document.getElementById('networkCanvas');
  const W = canvas.width, H = canvas.height;
  networkState.nodes.forEach(node => {
    node.x += node.vx;
    node.y += node.vy;
    if (node.x < 20 || node.x > W - 20) node.vx *= -1;
    if (node.y < 20 || node.y > H - 20) node.vy *= -1;
    node.x = Math.max(20, Math.min(W - 20, node.x));
    node.y = Math.max(20, Math.min(H - 20, node.y));
  });
}

function buildEdgeMap() {
  const map = {};
  networkState.edges.forEach(([a, b]) => {
    if (!map[a]) map[a] = [];
    if (!map[b]) map[b] = [];
    map[a].push(b);
    map[b].push(a);
  });
  return map;
}

function drawNetwork() {
  const canvas = document.getElementById('networkCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0e1a';
  ctx.fillRect(0, 0, W, H);

  // Draw edges
  networkState.edges.forEach(([a, b]) => {
    const na = networkState.nodes[a], nb = networkState.nodes[b];
    const isActive = (na.state === NODE_STATES.I || nb.state === NODE_STATES.I);
    ctx.beginPath();
    ctx.strokeStyle = isActive
      ? 'rgba(255,60,110,0.25)'
      : 'rgba(255,255,255,0.04)';
    ctx.lineWidth = isActive ? 1.2 : 0.5;
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.stroke();
  });

  // Draw nodes
  networkState.nodes.forEach(node => {
    const color = NODE_COLORS[node.state];
    const r = node.radius;

    if (node.state === NODE_STATES.I) {
      // Pulsing glow for infected
      const pulseR = r + 5 * Math.sin(node.pulse) * 0.5;
      const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, pulseR + 8);
      grad.addColorStop(0, 'rgba(255,60,110,0.5)');
      grad.addColorStop(1, 'rgba(255,60,110,0)');
      ctx.beginPath();
      ctx.arc(node.x, node.y, pulseR + 8, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    if (node.state !== NODE_STATES.D) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  });

  // Step counter
  ctx.fillStyle = 'rgba(255,60,110,0.8)';
  ctx.font = '11px JetBrains Mono';
  ctx.fillText(`Paso: ${networkState.step}`, 12, 20);
}

function resetNetwork() {
  if (networkState.animTimer) clearInterval(networkState.animTimer);
  networkState.running = false;
  networkState.nodes = [];
  networkState.edges = [];

  const canvas = document.getElementById('networkCanvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const overlay = document.getElementById('networkOverlay');
  overlay.style.display = 'flex';
  overlay.style.opacity = '1';

  document.getElementById('netInfected').textContent = '0';
  document.getElementById('netRecovered').textContent = '0';
  document.getElementById('netDead').textContent = '0';
  document.getElementById('netStep').textContent = '0';
}

function updateNetworkStats() {
  const nodes = networkState.nodes;
  const infected = nodes.filter(n => n.state === NODE_STATES.I).length;
  const recovered = nodes.filter(n => n.state === NODE_STATES.R).length;
  const dead = nodes.filter(n => n.state === NODE_STATES.D).length;

  document.getElementById('netInfected').textContent = infected;
  document.getElementById('netRecovered').textContent = recovered;
  document.getElementById('netDead').textContent = dead;
  document.getElementById('netStep').textContent = networkState.step;
}

// ══════════════════════════════════════════════════
//  RENDERIZADO DE ECUACIONES (KaTeX)
// ══════════════════════════════════════════════════
function renderEquations() {
  const eqs = [
    ['eq1', '\\frac{dS}{dt} = -\\frac{\\beta \\cdot S \\cdot I}{N}'],
    ['eq2', '\\frac{dE}{dt} = \\frac{\\beta \\cdot S \\cdot I}{N} - \\sigma \\cdot E'],
    ['eq3', '\\frac{dI}{dt} = \\sigma \\cdot E - \\gamma \\cdot I - \\delta \\cdot I'],
    ['eq4', '\\frac{dR}{dt} = \\gamma \\cdot I'],
    ['eq5', '\\frac{dD}{dt} = \\delta \\cdot I'],
    ['eqR0', 'R_0 = \\frac{\\beta}{\\gamma + \\delta}'],
    ['eqRK1', 'y_{n+1} = y_n + \\frac{h}{6}\\left(k_1 + 2k_2 + 2k_3 + k_4\\right)'],
    ['eqK1', 'k_1 = h \\cdot f(t_n,\\; y_n)'],
    ['eqK2', 'k_2 = h \\cdot f\\!\\left(t_n + \\tfrac{h}{2},\\; y_n + \\tfrac{k_1}{2}\\right)'],
    ['eqK3', 'k_3 = h \\cdot f\\!\\left(t_n + \\tfrac{h}{2},\\; y_n + \\tfrac{k_2}{2}\\right)'],
    ['eqK4', 'k_4 = h \\cdot f(t_n + h,\\; y_n + k_3)'],
    ['eqRKFinal', 'y_{n+1} = y_n + \\frac{h}{6}(k_1 + 2k_2 + 2k_3 + k_4) + \\mathcal{O}(h^5)'],
    ['eqIC', 'S(0) = N - I_0,\\quad E(0) = 0,\\quad I(0) = I_0,\\quad R(0) = 0,\\quad D(0) = 0 \\\\ S(t) + E(t) + I(t) + R(t) + D(t) = N \\quad \\forall\\, t \\geq 0'],
  ];

  eqs.forEach(([id, latex]) => {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      katex.render(latex, el, { displayMode: true, throwOnError: false });
    } catch (e) {
      el.textContent = latex;
    }
  });

  // RK4 step equations (inline)
  const inlines = [
    ['eqK1', 'k_1 = f(t_n,\\, y_n)'],
    ['eqK2', 'k_2 = f\\!\\left(t_n + \\tfrac{h}{2},\\, y_n + \\tfrac{h k_1}{2}\\right)'],
    ['eqK3', 'k_3 = f\\!\\left(t_n + \\tfrac{h}{2},\\, y_n + \\tfrac{h k_2}{2}\\right)'],
    ['eqK4', 'k_4 = f(t_n + h,\\, y_n + h k_3)'],
  ];

  inlines.forEach(([id, latex]) => {
    const el = document.getElementById(id);
    if (!el) return;
    try {
      katex.render(latex, el, { displayMode: false, throwOnError: false });
    } catch (e) {
      el.textContent = latex;
    }
  });
}
