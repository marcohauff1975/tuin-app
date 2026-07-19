/* Tuinapp frontend PoC — praat met de backend uit ../backend/
   API-basis is instelbaar via localStorage key "tuinapp_api". */

const API_BASE = localStorage.getItem('tuinapp_api') || 'http://127.0.0.1:8000';

const ANALYZE_STEPS = ['Foto uploaden', 'Soort matchen (Pl@ntNet)', 'Onderhoudsschema ophalen'];
const MONTHS_NL = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const DAYS_NL = ['Ma', 'Di', 'Wo', 'Do', 'Vr'];

const $ = (id) => document.getElementById(id);

const state = {
  screen: 'scan',
  files: [],
  photoUrl: null,
  result: null,
  garden: JSON.parse(localStorage.getItem('tuinapp_garden') || '[]'),
  done: JSON.parse(localStorage.getItem('tuinapp_done') || '{}'),
};

function saveGarden() { localStorage.setItem('tuinapp_garden', JSON.stringify(state.garden)); }
function saveDone() { localStorage.setItem('tuinapp_done', JSON.stringify(state.done)); }

function seasonNow() {
  const m = new Date().getMonth() + 1;
  if (m >= 3 && m <= 5) return 'lente';
  if (m >= 6 && m <= 8) return 'zomer';
  if (m >= 9 && m <= 11) return 'herfst';
  return 'winter';
}

/* ---------- navigatie ---------- */

function show(screen) {
  state.screen = screen;
  ['scan', 'analyzing', 'result', 'tuin', 'taken'].forEach((s) => {
    $('screen-' + s).classList.toggle('hidden', s !== screen);
  });
  const navVisible = ['tuin', 'taken'].includes(screen);
  $('bottom-nav').classList.toggle('hidden', !navVisible);
  $('nav-taken').classList.toggle('active', screen === 'taken');
  $('nav-tuin').classList.toggle('active', screen === 'tuin');
  $('btn-scan-cancel').classList.toggle('hidden', state.garden.length === 0);
  if (screen === 'tuin') renderGarden();
  if (screen === 'taken') renderTasks();
}

/* ---------- scan ---------- */

$('file-input').addEventListener('change', (e) => {
  state.files = [...e.target.files];
  const strip = $('preview-strip');
  strip.innerHTML = '';
  state.files.forEach((f) => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(f);
    img.alt = f.name;
    strip.appendChild(img);
  });
  $('btn-identify').disabled = state.files.length === 0;
});

$('btn-identify').addEventListener('click', identify);
$('btn-scan-cancel').addEventListener('click', () => show('taken'));

async function identify() {
  show('analyzing');
  renderAnalyzeSteps(0);

  const form = new FormData();
  state.files.forEach((f) => form.append('files', f));
  state.photoUrl = state.files.length ? URL.createObjectURL(state.files[0]) : null;

  const stepTimer = setInterval(() => {
    const active = document.querySelectorAll('.analyze-step.done').length + 1;
    if (active < ANALYZE_STEPS.length) renderAnalyzeSteps(active);
  }, 900);

  try {
    const res = await fetch(API_BASE + '/identify', { method: 'POST', body: form });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    state.result = await res.json();
  } catch (err) {
    state.result = { error: String(err) };
  } finally {
    clearInterval(stepTimer);
    renderAnalyzeSteps(ANALYZE_STEPS.length);
    setTimeout(() => { renderResult(); show('result'); }, 350);
  }
}

function renderAnalyzeSteps(activeIdx) {
  $('analyze-steps').innerHTML = ANALYZE_STEPS.map((label, i) => {
    const cls = i < activeIdx ? 'done' : i === activeIdx ? 'active' : '';
    const mark = i < activeIdx ? '✓' : '…';
    return `<div class="analyze-step ${cls}"><span class="mark">${mark}</span><span class="label">${label}</span></div>`;
  }).join('');
}

/* ---------- resultaat ---------- */

function renderResult() {
  const r = state.result;
  const body = $('result-body');
  const addBtn = $('btn-add-garden');
  addBtn.classList.add('hidden');

  if (r.error) {
    $('result-title').textContent = 'Er ging iets mis';
    body.innerHTML = `<div class="notice-card warn">De herkenning is niet gelukt (${r.error}). Controleer of de backend draait en probeer het opnieuw.</div>`;
    return;
  }

  if (!r.recognized) {
    $('result-title').textContent = 'Geen plant herkend';
    body.innerHTML = `<div class="notice-card warn">We konden geen plant herkennen in deze foto. Kom dichterbij en focus op het blad of de bloem.</div>`;
    return;
  }

  const conf = Math.round(r.best_match.confidence * 100);
  const low = conf < 75;
  const s = r.schedule;
  const name = s ? s.common_name_nl : r.best_match.scientific_name;
  $('result-title').textContent = 'We herkenden je plant';

  const photo = state.photoUrl
    ? `<img src="${state.photoUrl}" alt="jouw foto">`
    : '';

  let html = `
    <div class="result-card">
      <div class="result-photo">${photo}
        <span class="conf-chip ${low ? 'low' : ''}">${conf}% zeker</span>
      </div>
      <div class="result-info">
        <div class="result-name">${name}</div>
        <div class="result-latin">${r.best_match.scientific_name}</div>
        <div class="conf-bar-row ${low ? 'low' : ''}">
          <div class="conf-bar"><div style="width:${conf}%"></div></div>
          <span class="conf-label">${conf}% zeker</span>
        </div>
        ${low ? '<div class="chip-row"><span class="chip" style="background:#f0e4dc;color:#b05c2a">Twijfel? Maak een close-up van het blad</span></div>' : ''}
      </div>
    </div>`;

  if (r.in_database && s) {
    const fert = Object.entries(s.fertilizing)
      .map(([season, advice]) => `<div class="schedule-row"><span class="icon">✓</span><span class="text">Bemesting ${season}: ${advice}</span></div>`)
      .join('');
    html += `
      <div class="schedule-card">
        <div class="sc-title">Dit betekent voor jou</div>
        <div class="schedule-row"><span class="icon">✂</span><span class="text">Snoeien in ${s.pruning_month}</span></div>
        ${fert}
        <div class="schedule-row"><span class="icon">💧</span><span class="text">Water: ${s.watering}</span></div>
      </div>`;
    addBtn.classList.remove('hidden');
  } else {
    html += `<div class="notice-card">Deze soort is herkend, maar staat nog niet in onze onderhoudsdatabase (PoC: 10 soorten). Het schema volgt in een latere versie.</div>`;
  }

  body.innerHTML = html;
}

$('btn-add-garden').addEventListener('click', () => {
  const r = state.result;
  const id = r.best_match.scientific_name.toLowerCase().replace(/[^a-z]+/g, '-');
  if (!state.garden.some((g) => g.id === id)) {
    state.garden.push({
      id,
      scientific_name: r.best_match.scientific_name,
      confidence: r.best_match.confidence,
      schedule: r.schedule,
      photo: null,
    });
    saveGarden();
  }
  show('taken');
});

$('btn-retry').addEventListener('click', resetScan);

function resetScan() {
  state.files = [];
  $('file-input').value = '';
  $('preview-strip').innerHTML = '';
  $('btn-identify').disabled = true;
  show('scan');
}

/* ---------- mijn tuin ---------- */

function renderGarden() {
  const grid = $('garden-grid');
  const cards = state.garden.map((g) => {
    const s = g.schedule;
    const next = s ? `Snoei · ${s.pruning_month}` : 'Nog geen schema';
    return `
      <div class="garden-card">
        <div class="photo"></div>
        <div class="info">
          <div class="name">${s ? s.common_name_nl : g.scientific_name}</div>
          <div class="next">${next}</div>
        </div>
      </div>`;
  }).join('');
  grid.innerHTML = cards + `
    <button class="garden-add" id="btn-garden-add">
      <span class="plus">+</span><span class="label">Herken een plant</span>
    </button>`;
  $('btn-garden-add').addEventListener('click', resetScan);
}

/* ---------- taken ---------- */

function tasksForGarden() {
  const monthNow = MONTHS_NL[new Date().getMonth()];
  const season = seasonNow();
  const tasks = [];
  state.garden.forEach((g) => {
    const s = g.schedule;
    if (!s) return;
    const name = s.common_name_nl.toLowerCase();
    tasks.push({ id: g.id + '-water', title: `Geef de ${name} water`, sub: s.watering });
    if (s.pruning_month === monthNow) {
      tasks.push({ id: g.id + '-snoei', title: `Snoei de ${name}`, sub: `Beste moment: ${s.pruning_month}` });
    }
    const fert = s.fertilizing[season];
    if (fert && fert !== 'niet nodig') {
      tasks.push({ id: g.id + '-mest', title: `Bemest de ${name}`, sub: `${season}: ${fert}` });
    }
  });
  return tasks;
}

function renderTasks() {
  const now = new Date();
  const week = getWeekNumber(now);
  $('week-kicker').textContent =
    MONTHS_NL[now.getMonth()][0].toUpperCase() + MONTHS_NL[now.getMonth()].slice(1) + ' · week ' + week;

  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  $('week-days').innerHTML = DAYS_NL.map((d, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    const today = date.toDateString() === now.toDateString();
    return `<span class="week-day ${today ? 'today' : ''}">${d} ${date.getDate()}</span>`;
  }).join('');

  const tasks = tasksForGarden();
  const list = $('task-list');
  if (tasks.length === 0) {
    list.innerHTML = `<div class="empty-state">Nog geen taken. Herken eerst een plant met de <strong>+</strong> knop — je schema verschijnt hier vanzelf.</div>`;
  } else {
    list.innerHTML = tasks.map((t) => {
      const done = !!state.done[t.id];
      return `
        <div class="task-card ${done ? 'done' : ''}" data-task="${t.id}">
          <div class="box">${done ? '✓' : ''}</div>
          <div><div class="t-title">${t.title}</div><div class="t-sub">${done ? 'Zojuist afgerond' : t.sub}</div></div>
        </div>`;
    }).join('');
    list.querySelectorAll('.task-card').forEach((el) => {
      el.addEventListener('click', () => {
        const id = el.dataset.task;
        state.done[id] = !state.done[id];
        saveDone();
        renderTasks();
      });
    });
  }

  const open = tasks.filter((t) => !state.done[t.id]).length;
  $('task-badge').classList.toggle('hidden', open === 0);
  $('task-badge').textContent = open;
}

function getWeekNumber(d) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
}

/* ---------- navigatie & premium ---------- */

$('nav-taken').addEventListener('click', () => show('taken'));
$('nav-tuin').addEventListener('click', () => show('tuin'));
$('nav-scan').addEventListener('click', resetScan);
$('premium-banner').addEventListener('click', () => $('premium-sheet').classList.remove('hidden'));
$('btn-premium-try').addEventListener('click', () => $('premium-sheet').classList.add('hidden'));
$('btn-premium-close').addEventListener('click', () => $('premium-sheet').classList.add('hidden'));

/* ---------- start ---------- */

async function checkBackend() {
  try {
    const res = await fetch(API_BASE + '/health');
    $('offline-banner').classList.toggle('hidden', res.ok);
  } catch {
    $('offline-banner').classList.remove('hidden');
  }
}

checkBackend();
show(state.garden.length > 0 ? 'taken' : 'scan');
