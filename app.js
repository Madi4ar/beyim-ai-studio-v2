// Beyim Studio — clickable prototype. Vanilla JS, hash router, in-memory state.
// No backend: generation is simulated with timers so the realtime-progress UX can be felt.

const state = {
  route: '#/home',
  projects: [...SEED_PROJECTS],
  selectedQuick: { grade: 7, subject: 'История Казахстана', language: 'Қазақша' },
  createSource: 'topic',
  createIntent: null,
  showMoreParams: false,
  libraryTab: 'templates',
  teachTimer: { running: false, seconds: 0 },
  versionCounter: {},
  timers: {},
};

// ---------- utils ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function esc(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function findProject(id) { return state.projects.find(p => p.id === id); }

function toast(msg, iconName, tone) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = 'toast' + (tone ? ` is-${tone}` : '');
  el.innerHTML = `${iconName ? icon(iconName, 'w-4 h-4') : ''}<span>${esc(msg)}</span>`;
  root.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .2s'; }, 1800);
  setTimeout(() => el.remove(), 2100);
}

// variant -> {icon, class} for persistent inline banners (distinct from toasts: these stay
// on the page until the user acts, for things that need more than a line of text).
const ALERT_ICON = { info: 'info', success: 'check', warning: 'warn', danger: 'warn' };

function alertBanner({ variant = 'info', title, text, actionsHtml = '', closeAction = '' }) {
  return `<div class="alert alert-${variant}">
    <span class="alert-icon">${icon(ALERT_ICON[variant], 'w-5 h-5')}</span>
    <div class="alert-body">
      <div class="alert-title">${title}</div>
      ${text ? `<div class="alert-text">${text}</div>` : ''}
      ${actionsHtml ? `<div class="alert-actions">${actionsHtml}</div>` : ''}
    </div>
    ${closeAction ? `<button class="alert-close" data-action="${closeAction.action}" ${closeAction.attrs || ''} aria-label="Закрыть">${icon('close', 'w-4 h-4')}</button>` : ''}
  </div>`;
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'только что';
  if (m < 60) return `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} дн назад`;
}

// ---------- sidebar ----------

const NAV_ITEMS = [
  { route: '#/home', icon: 'home', label: 'Главная' },
  { route: '#/create', icon: 'sparkle', label: 'AI Create' },
  { route: '#/my', icon: 'folder', label: 'Материалы' },
  { route: '#/templates', icon: 'grid', label: 'Шаблоны' },
  { route: '#/library', icon: 'library', label: 'Библиотека' },
  { route: '#/teach', icon: 'play', label: 'Урок' },
  { route: '#/analytics', icon: 'chart', label: 'Аналитика' },
  { route: '#/settings', icon: 'settings', label: 'Настройки' },
];

function renderSidebar() {
  const current = state.route.split('/').slice(0, 2).join('/');
  const items = NAV_ITEMS.map(item => {
    const active = current === item.route || (item.route === '#/my' && current.startsWith('#/results'));
    return `<a href="${item.route}" class="nav-item ${active ? 'is-active' : ''}" aria-current="${active ? 'page' : 'false'}">
      ${icon(item.icon)}
      <span>${item.label}</span>
    </a>`;
  }).join('');

  $('#sidebar').innerHTML = `
    <div class="mb-6 flex items-center justify-center w-10 h-10 rounded-md" style="background:var(--color-brand)">
      <span class="font-semibold text-sm" style="color:var(--color-on-brand)">B</span>
    </div>
    <nav class="flex flex-col gap-1 flex-1">${items}</nav>
    <a href="#/settings" class="nav-item" title="${esc(TEACHER_PROFILE.name)}">
      <div class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium" style="background:var(--color-brand-soft); color:var(--color-brand-dark)">
        ${esc(TEACHER_PROFILE.name.split(' ').map(w => w[0]).slice(0, 2).join(''))}
      </div>
    </a>
  `;
}

// ---------- shared shell for standard (non-fullscreen) views ----------

function shell({ title, subtitle, actions = '', body, wide = false }) {
  return `
    <div class="flex-1 min-w-0 flex flex-col">
      <header class="flex items-center justify-between gap-4 px-8 py-5 border-b" style="border-color:var(--color-border)">
        <div class="min-w-0">
          <h1 class="text-[20px] font-semibold tracking-[-0.01em] truncate">${title}</h1>
          ${subtitle ? `<p class="text-[13px] mt-0.5" style="color:var(--color-ink-soft)">${subtitle}</p>` : ''}
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">${actions}</div>
      </header>
      <div class="flex-1 overflow-y-auto scrollpane">
        <div class="${wide ? 'max-w-shell' : 'max-w-[1080px]'} mx-auto px-8 py-8">
          ${body}
        </div>
      </div>
    </div>
  `;
}

function autosaveBadge() {
  return `<div class="flex items-center gap-1.5 text-[12.5px]" style="color:var(--color-ink-soft)">
    ${icon('check', 'w-3.5 h-3.5')}<span>Сохранено</span>
  </div>`;
}

// ---------- material card ----------

function materialCard(project, m) {
  const t = MATERIAL_TYPES[m.key];
  const ready = m.status === 'ready';
  const running = m.status === 'running';
  const failed = m.status === 'failed';
  return `
    <div class="card card-hover p-5 flex flex-col gap-3 ${ready ? '' : 'opacity-90'}">
      <div class="flex items-start justify-between">
        <div class="w-9 h-9 rounded-md flex items-center justify-center" style="background:var(--color-brand-soft); color:var(--color-brand-dark)">
          ${icon(t.icon, 'w-[18px] h-[18px]')}
        </div>
        ${ready ? `<span class="flex items-center gap-1 text-[12px]" style="color:var(--color-success)">${icon('check', 'w-3.5 h-3.5')}Готово</span>`
          : failed ? `<span class="flex items-center gap-1 text-[12px]" style="color:var(--color-danger)">${icon('warn', 'w-3.5 h-3.5')}Ошибка</span>`
          : running ? `<span class="flex items-center gap-1.5 text-[12px]" style="color:var(--color-brand)"><span class="pulse-dot"></span>Создаётся</span>`
          : `<span class="text-[12px]" style="color:var(--color-ink-faint)">В очереди</span>`}
      </div>
      <div>
        <div class="font-medium text-[14.5px] leading-snug">${t.label}</div>
        <div class="text-[13px] mt-0.5" style="color:var(--color-ink-soft)">${esc(project.topic)}, ${m.count} ${t.unit}</div>
      </div>
      <div class="flex items-center justify-between text-[12.5px] mt-1" style="color:var(--color-ink-soft)">
        <span class="flex items-center gap-1">${icon('globe', 'w-3.5 h-3.5')}${esc(project.language)}</span>
        <span class="flex items-center gap-1">${icon('clock', 'w-3.5 h-3.5')}${estimateMinutes(m.key)} мин</span>
      </div>
      ${ready
        ? `<button class="btn btn-secondary btn-sm mt-1" data-action="open-editor" data-project="${project.id}" data-material="${m.key}">Открыть ${icon('chevronRight', 'w-3.5 h-3.5')}</button>`
        : failed
        ? `<button class="btn btn-secondary btn-sm mt-1" data-action="retry-material" data-project="${project.id}" data-material="${m.key}">Повторить</button>`
        : `<button class="btn btn-secondary btn-sm mt-1" disabled>${running ? 'Генерируется…' : 'Ожидает очереди'}</button>`}
    </div>
  `;
}

function estimateMinutes(key) {
  const map = { ksp: 2, presentation: 12, worksheet: 10, quiz: 8, tasks3: 15, reflection: 5, homework: 10, detective: 12, cards: 6 };
  return map[key] || 8;
}

// ---------- VIEW: home ----------

function viewHome() {
  const recent = [...state.projects].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  const quick = QUICK_ACTIONS.map(a => `
    <button class="chip" data-action="quick-create" data-key="${a.key}">
      ${icon(a.icon, 'w-4 h-4')}<span>${a.label}</span>
    </button>
  `).join('');

  const recentCards = recent.map(p => projectCard(p)).join('') || emptyState('folder', 'Пока нет материалов', 'Создайте первый комплект урока — он появится здесь.');

  return shell({
    title: 'Главная',
    subtitle: `${TEACHER_PROFILE.name.split(' ')[0]}, что будем готовить к уроку?`,
    actions: autosaveBadge(),
    body: `
      <div class="enter">
        <h2 class="text-[26px] font-semibold tracking-[-0.015em] mb-5">Что будем создавать сегодня?</h2>

        <form class="card p-5" data-form="home-create">
          <textarea name="topic" rows="2" placeholder="Введите тему, учебную цель или вставьте текст..."
            class="w-full resize-none border-0 outline-none text-[16px] placeholder:text-ink-faint" style="color:var(--color-ink)"></textarea>
          <div class="flex items-center justify-between mt-3 pt-3 border-t flex-wrap gap-3" style="border-color:var(--color-border)">
            <div class="flex items-center gap-2 flex-wrap">
              ${paramPill('grade', state.selectedQuick.grade + ' класс', 'users')}
              ${paramPill('subject', state.selectedQuick.subject, 'book')}
              ${paramPill('language', state.selectedQuick.language, 'globe')}
            </div>
            <button type="submit" class="btn btn-primary">${icon('sparkle', 'w-4 h-4')}Создать материалы</button>
          </div>
        </form>

        <div class="mt-6">
          <div class="text-[13px] font-medium mb-3" style="color:var(--color-ink-soft)">Быстрые действия</div>
          <div class="flex flex-wrap gap-2">${quick}</div>
        </div>

        <div class="mt-9">
          <div class="flex items-center justify-between mb-3">
            <div class="text-[13px] font-medium" style="color:var(--color-ink-soft)">Последние материалы</div>
            <a href="#/my" class="text-[13px] flex items-center gap-1" style="color:var(--color-brand)">Все материалы ${icon('chevronRight', 'w-3.5 h-3.5')}</a>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${recentCards}</div>
        </div>
      </div>
    `,
  });
}

function paramPill(key, label, iconName) {
  return `<span class="chip" style="cursor:default">${icon(iconName, 'w-3.5 h-3.5')}<span>${esc(label)}</span></span>`;
}

function emptyState(iconName, title, text) {
  return `<div class="col-span-full flex flex-col items-center justify-center text-center py-14 px-6 border rounded-lg" style="border-color:var(--color-border)">
    <div class="w-11 h-11 rounded-full flex items-center justify-center mb-3" style="background:var(--color-bg); color:var(--color-ink-soft)">${icon(iconName, 'w-5 h-5')}</div>
    <div class="font-medium text-[14.5px]">${title}</div>
    <div class="text-[13px] mt-1 measure" style="color:var(--color-ink-soft)">${text}</div>
  </div>`;
}

function projectCard(p) {
  const readyCount = p.materials.filter(m => m.status === 'ready').length;
  const isGenerating = p.status === 'generating';
  return `
    <a href="${isGenerating ? '#/generate/' + p.id : '#/results/' + p.id}" class="card card-hover p-5 flex flex-col gap-3 block">
      <div class="flex items-start justify-between">
        <div class="font-medium text-[15px] leading-snug pr-2">${esc(p.topic)}</div>
        ${isGenerating ? `<span class="pulse-dot flex-shrink-0 mt-1.5"></span>` : ''}
      </div>
      <div class="text-[13px]" style="color:var(--color-ink-soft)">
        ${p.grade} класс, ${esc(p.subject)}
      </div>
      ${isGenerating
        ? `<div>
             <div class="bar-track thin"><div class="bar-fill" style="transform:scaleX(${p.progress / 100})"></div></div>
             <div class="text-[12.5px] mt-1.5 tnum" style="color:var(--color-brand)">Генерация: ${p.progress}%</div>
           </div>`
        : `<div class="text-[12.5px]" style="color:var(--color-ink-soft)">Готово ${readyCount} материалов, ${timeAgo(p.createdAt)}</div>`}
    </a>
  `;
}

// ---------- VIEW: create ----------

const SOURCE_TABS = [
  { key: 'topic', icon: 'sparkle', label: 'Тема' },
  { key: 'text', icon: 'file', label: 'Текст' },
  { key: 'pdf', icon: 'upload', label: 'PDF / Word' },
  { key: 'link', icon: 'link', label: 'Ссылка' },
  { key: 'image', icon: 'image', label: 'Изображение' },
  { key: 'own', icon: 'folder', label: 'Мой материал' },
];

function viewCreate() {
  const tabs = SOURCE_TABS.map(t => `
    <button type="button" class="chip ${state.createSource === t.key ? 'is-selected' : ''}" data-action="create-source" data-key="${t.key}">
      ${icon(t.icon, 'w-4 h-4')}<span>${t.label}</span>
    </button>
  `).join('');

  const intents = TEACHER_INTENTS.map(i => `
    <button type="button" class="chip ${state.createIntent === i ? 'is-selected' : ''}" data-action="create-intent" data-key="${esc(i)}">${esc(i)}</button>
  `).join('');

  const inputArea = state.createSource === 'topic' || state.createSource === 'text'
    ? `<textarea name="topic" rows="4" placeholder="${state.createSource === 'topic' ? 'Тема урока или учебная цель...' : 'Вставьте текст — AI поймёт тему и уровень сложности...'}"
        class="w-full resize-none border-0 outline-none text-[16px] placeholder:text-ink-faint" style="color:var(--color-ink)"></textarea>`
    : state.createSource === 'link'
    ? `<div class="flex flex-col items-center gap-3 py-8 text-center">
        ${icon('link', 'w-7 h-7')}
        <div class="text-[14px]" style="color:var(--color-ink-soft)">Вставьте ссылку на статью, видео или сайт</div>
        <input type="url" name="sourceUrl" placeholder="https://..." class="w-full max-w-sm border rounded-md px-3 py-2 text-[14px] outline-none" style="border-color:var(--color-border)">
      </div>`
    : state.createSource === 'own'
    ? `<div class="flex flex-col items-center gap-3 py-8 text-center">
        ${icon('folder', 'w-7 h-7')}
        <div class="text-[14px]" style="color:var(--color-ink-soft)">Выберите материал из «Мои материалы» для адаптации</div>
        <a href="#/my" class="btn btn-secondary btn-sm">Открыть «Мои материалы»</a>
      </div>`
    : `<div class="flex flex-col items-center gap-3 py-8 text-center">
        ${icon(state.createSource === 'pdf' ? 'upload' : 'image', 'w-7 h-7')}
        <div class="text-[14px]" style="color:var(--color-ink-soft)">${state.createSource === 'pdf' ? 'Перетащите PDF или Word, или выберите файл' : 'Загрузите изображение — AI распознает текст и тему'}</div>
        <label class="btn btn-secondary btn-sm" style="cursor:pointer">
          Выбрать файл
          <input type="file" name="sourceFile" accept="${state.createSource === 'pdf' ? '.pdf,.doc,.docx' : 'image/*'}" class="hidden" data-action="file-chosen">
        </label>
        <span class="text-[12.5px]" data-role="chosen-file-name" style="color:var(--color-ink-soft)">${state.chosenFileName ? esc(state.chosenFileName) : ''}</span>
      </div>`;

  return shell({
    title: 'AI Create',
    subtitle: 'Начните с темы, цели, текста, файла или ссылки — остальное уточнения.',
    actions: autosaveBadge(),
    body: `
      <div class="enter">
        <div class="flex flex-wrap gap-2 mb-4">${tabs}</div>

        <form class="card p-5" data-form="ai-create">
          ${inputArea}
          <div class="pt-3 mt-1 border-t" style="border-color:var(--color-border)">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              ${selectField('subject', 'Предмет', ['История Казахстана', 'Алгебра', 'Биология', 'Русский язык', 'Қазақ тілі', 'Всемирная история'], state.selectedQuick.subject)}
              ${selectField('grade', 'Класс', [5,6,7,8,9,10,11].map(String), String(state.selectedQuick.grade))}
              ${selectField('language', 'Язык', ['Қазақша', 'Русский'], state.selectedQuick.language)}
            </div>

            <button type="button" class="text-[13px] flex items-center gap-1 mt-4" style="color:var(--color-brand)" data-action="toggle-more-params">
              ${icon(state.showMoreParams ? 'chevronDown' : 'chevronRight', 'w-3.5 h-3.5')}
              ${state.showMoreParams ? 'Скрыть уточнения' : 'Показать больше уточнений (необязательно)'}
            </button>

            ${state.showMoreParams ? `
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                ${selectField('duration', 'Длительность урока', ['30 минут', '40 минут', '45 минут', '70 минут (сдвоенный)'], '45 минут')}
                ${selectField('difficulty', 'Уровень сложности', ['Базовый', 'Стандартный', 'Повышенный'], 'Стандартный')}
                ${selectField('style', 'Стиль подачи', ['Академический', 'Простой', 'Для школьника', 'Методический'], 'Методический')}
              </div>
            ` : ''}

            <div class="mt-4">
              <div class="text-[13px] font-medium mb-2" style="color:var(--color-ink-soft)">Цель на уроке</div>
              <div class="flex flex-wrap gap-2">${intents}</div>
            </div>
          </div>

          <div class="flex items-center justify-between mt-5 pt-4 border-t flex-wrap gap-3" style="border-color:var(--color-border)">
            <label class="flex items-center gap-2 text-[13px]" style="color:var(--color-ink-soft)">
              ${icon('users', 'w-4 h-4')}
              Профиль класса «${CLASS_PROFILE.name}» подключён — дифференциация предложится автоматически
            </label>
            <button type="submit" class="btn btn-primary">${icon('sparkle', 'w-4 h-4')}Создать материалы</button>
          </div>
        </form>
      </div>
    `,
  });
}

function selectField(name, label, options, selected) {
  const opts = options.map(o => `<option value="${esc(o)}" ${o === selected ? 'selected' : ''}>${esc(o)}</option>`).join('');
  return `<label class="block">
    <span class="block text-[12.5px] mb-1.5" style="color:var(--color-ink-soft)">${label}</span>
    <select name="${name}" class="w-full border rounded-md px-3 py-2 text-[14px] bg-surface" style="border-color:var(--color-border)">${opts}</select>
  </label>`;
}

// ---------- generation engine ----------

function startGeneration(project) {
  project.status = 'generating';
  project.progress = 0;
  project.materials.forEach(m => { m.status = 'pending'; m.failRolled = false; });
  project.currentStageIdx = 0;
  project.liveMsgIdx = 0;
  project.hasFailed = false;

  const timerId = setInterval(() => tickGeneration(project), 450);
  state.timers[project.id] = timerId;
}

// A generation package can have more than one material, so one real backend call failing
// should not restart the whole project (TZ §63) — at most one material rolls a failure,
// surfaced as a dismissable alert with its own retry, the rest keep generating normally.
const FAIL_CHANCE = 0.22;

function tickGeneration(project) {
  project.progress = Math.min(100, project.progress + (1 + Math.random() * 2.2));
  project.progress = Math.round(project.progress * 10) / 10;

  project.currentStageIdx = Math.min(GEN_STAGES.length - 1, Math.floor((project.progress / 100) * GEN_STAGES.length));
  if (Math.random() < 0.06) project.liveMsgIdx = Math.min(LIVE_MESSAGES.length - 1, project.liveMsgIdx + 1);

  UNLOCK_SEQUENCE.forEach(u => {
    const m = project.materials.find(mm => mm.key === u.key);
    if (!m || m.status === 'failed') return;
    if (project.progress >= u.pct) {
      if (!m.failRolled) {
        m.failRolled = true;
        if (!project.hasFailed && Math.random() < FAIL_CHANCE) {
          m.status = 'failed';
          project.hasFailed = true;
          toast(`Не удалось создать «${MATERIAL_TYPES[m.key].label}»`, 'warn', 'danger');
          return;
        }
      }
      m.status = 'ready';
    } else if (project.progress >= u.pct - 14) {
      m.status = 'running';
    }
  });

  if (project.progress >= 100) {
    project.progress = 100;
    project.status = 'ready';
    project.materials.forEach(m => { if (m.status !== 'failed') m.status = 'ready'; });
    clearInterval(state.timers[project.id]);
    delete state.timers[project.id];
  }

  // The generation screen re-renders every ~450ms while progress ticks. A full innerHTML
  // teardown that often — rebuilding every icon, row and the sidebar — was the jank reported
  // on this screen: it also meant the ring/percentage never had a stable element to transition
  // from, so they visibly snapped instead of animating. While still generating, patch the few
  // nodes that actually changed in place; only do a full render() for the one-time ready-state
  // swap (new CTA button) or when some other page's compact progress bar needs it.
  if (state.route === `#/generate/${project.id}`) {
    if (project.status === 'generating' ? !updateGenerateDOM(project) : true) render();
  } else if (state.route === '#/home' || state.route === '#/my') {
    render();
  }
}

function updateGenerateDOM(project) {
  const root = $('#view-root');
  const pctEl = root.querySelector('#gen-pct');
  if (!pctEl) return false; // markup not mounted (shouldn't happen given the route check, but stay safe)

  pctEl.textContent = Math.round(project.progress) + '%';

  const r = 54, circumference = 2 * Math.PI * r;
  const ringFill = root.querySelector('#gen-ring-fill');
  if (ringFill) ringFill.setAttribute('stroke-dashoffset', circumference * (1 - project.progress / 100));

  const msg = LIVE_MESSAGES[project.liveMsgIdx];
  const sidebarMsg = root.querySelector('#gen-sidebar-msg');
  if (sidebarMsg) sidebarMsg.textContent = msg;
  const heroMsg = root.querySelector('#gen-hero-msg');
  if (heroMsg) heroMsg.textContent = msg;

  const stagesWrap = root.querySelector('#gen-stages');
  if (stagesWrap) stagesWrap.innerHTML = GEN_STAGES.map((s, idx) => genStageRowHtml(project, s, idx)).join('');

  const materialsWrap = root.querySelector('#gen-materials');
  if (materialsWrap) materialsWrap.innerHTML = project.materials.map(m => genMaterialRowHtml(project, m)).join('');

  const failureWrap = root.querySelector('#gen-failure-wrap');
  if (failureWrap) {
    const html = genFailureAlertHtml(project);
    failureWrap.innerHTML = html ? `<div class="mb-4">${html}</div>` : '';
  }

  return true;
}

// ---------- VIEW: generate (3-column live screen) ----------

// Hoisted out of viewGenerate so the incremental updater below (updateGenerateDOM) can
// render the same row markup without duplicating it.
function genStageRowHtml(project, s, idx) {
  const status = idx < project.currentStageIdx ? 'done' : idx === project.currentStageIdx && project.status === 'generating' ? 'running' : idx === project.currentStageIdx && project.status === 'ready' ? 'done' : 'pending';
  return `<div class="flex items-center gap-3 py-2" data-stage-row="${s.key}">
    <span class="step-icon is-${status}">${status === 'done' ? icon('check', 'w-4 h-4') : status === 'running' ? `<span class="pulse-dot"></span>` : icon('dot', 'w-3 h-3')}</span>
    <span class="text-[13.5px]" style="color:${status === 'pending' ? 'var(--color-ink-faint)' : 'var(--color-ink)'}">${s.label}</span>
  </div>`;
}

function genMaterialRowHtml(project, m) {
  const t = MATERIAL_TYPES[m.key];
  const iconStatus = m.status === 'ready' ? 'done' : m.status === 'failed' ? 'done' : m.status === 'running' ? 'running' : 'pending';
  return `<div class="flex items-center justify-between py-2.5 border-b last:border-0" style="border-color:var(--color-border)" data-material-row="${m.key}">
    <span class="flex items-center gap-2.5 text-[13.5px]">
      <span class="step-icon is-${iconStatus}" style="${m.status === 'failed' ? 'color:var(--color-danger)' : ''}">
        ${m.status === 'ready' ? icon('check', 'w-4 h-4') : m.status === 'failed' ? icon('warn', 'w-4 h-4') : m.status === 'running' ? `<span class="pulse-dot"></span>` : icon('dot', 'w-3 h-3')}
      </span>
      ${t.label}
    </span>
    ${m.status === 'ready'
      ? `<button class="text-[12.5px] flex items-center gap-1 font-medium" style="color:var(--color-brand)" data-action="open-editor" data-project="${project.id}" data-material="${m.key}">Открыть ${icon('chevronRight', 'w-3 h-3')}</button>`
      : m.status === 'failed'
      ? `<button class="text-[12.5px] font-medium" style="color:var(--color-danger)" data-action="retry-material" data-project="${project.id}" data-material="${m.key}">Повторить</button>`
      : `<span class="text-[12px]" style="color:var(--color-ink-faint)">${m.status === 'running' ? 'создаётся' : 'в очереди'}</span>`}
  </div>`;
}

function genFailureAlertHtml(project) {
  const failedMaterial = project.materials.find(m => m.status === 'failed');
  if (!failedMaterial) return '';
  const readyLabels = project.materials.filter(m => m.status === 'ready').map(m => MATERIAL_TYPES[m.key].label);
  return alertBanner({
    variant: 'danger',
    title: `Не удалось создать «${MATERIAL_TYPES[failedMaterial.key].label}»`,
    text: readyLabels.length ? `${readyLabels.join(', ')} уже готовы — можно открыть их прямо сейчас, не дожидаясь повтора.` : 'Остальные материалы продолжают создаваться в обычном режиме.',
    actionsHtml: `<button class="btn btn-sm" style="background:var(--color-danger); color:var(--color-on-brand)" data-action="retry-material" data-project="${project.id}" data-material="${failedMaterial.key}">Повторить ${MATERIAL_TYPES[failedMaterial.key].label.toLowerCase()}</button>`,
  });
}

function viewGenerate(id) {
  const project = findProject(id);
  if (!project) return viewNotFound();

  const stages = GEN_STAGES.map((s, idx) => genStageRowHtml(project, s, idx)).join('');
  const materialRows = project.materials.map(m => genMaterialRowHtml(project, m)).join('');
  const failedMaterial = project.materials.find(m => m.status === 'failed');
  const failureAlert = genFailureAlertHtml(project);

  const r = 54, circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - project.progress / 100);

  return `
    <div class="flex-1 min-w-0 grid" style="grid-template-columns: 340px minmax(0,1fr)">
      <aside class="border-r flex flex-col" style="border-color:var(--color-border)">
        <div class="px-5 py-4 border-b flex items-center gap-2" style="border-color:var(--color-border)">
          <a href="#/create" class="btn-ghost btn btn-sm" style="padding:6px">${icon('chevronLeft', 'w-4 h-4')}</a>
          <span class="text-[13px] font-medium">Контекст генерации</span>
        </div>
        <div class="px-5 py-4 overflow-y-auto scrollpane flex-1">
          <div class="flex items-start gap-2.5 mb-4">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0" style="background:var(--color-brand-soft); color:var(--color-brand-dark)">
              ${esc(TEACHER_PROFILE.name.split(' ').map(w => w[0]).slice(0, 2).join(''))}
            </div>
            <div class="text-[13.5px] leading-relaxed">
              Создай комплект материалов для урока по теме «${esc(project.topic)}», ${project.grade} класс, ${project.duration} минут.
            </div>
          </div>
          <div class="flex items-start gap-2.5">
            <div class="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style="background:var(--color-brand); color:var(--color-on-brand)">${icon('sparkle', 'w-4 h-4')}</div>
            <div class="text-[13.5px] leading-relaxed" id="gen-sidebar-msg" style="color:var(--color-ink-soft)">
              ${project.status === 'generating' ? LIVE_MESSAGES[project.liveMsgIdx] : 'Материалы готовы. Можно открыть любой из них или попросить что-то изменить.'}
            </div>
          </div>

          <div class="mt-6 pt-4 border-t" style="border-color:var(--color-border)">
            <div class="text-[12px] font-medium mb-2" style="color:var(--color-ink-soft)">Этапы</div>
            <div id="gen-stages">${stages}</div>
          </div>
        </div>
        <form class="px-4 py-3 border-t flex items-center gap-2" style="border-color:var(--color-border)" data-form="refine-chat">
          <input type="text" placeholder="Уточнить запрос..." class="flex-1 border rounded-md px-3 py-2 text-[13.5px] outline-none" style="border-color:var(--color-border)">
          <button class="btn btn-secondary btn-sm" type="submit" style="padding:8px">${icon('chevronRight', 'w-4 h-4')}</button>
        </form>
      </aside>

      <section class="flex flex-col items-center justify-center px-10 py-10 overflow-y-auto scrollpane">
        <div class="enter flex flex-col items-center text-center w-full max-w-md">
          <div class="text-[13px] font-medium mb-1" style="color:var(--color-brand)">Beyim AI</div>
          <h2 class="text-[22px] font-semibold mb-6">${project.status === 'generating' ? 'Создаём ваш урок' : 'Урок готов'}</h2>

          <div class="relative w-[140px] h-[140px] mb-6">
            <svg class="progress-ring w-full h-full" viewBox="0 0 120 120">
              <circle class="ring-track" cx="60" cy="60" r="${r}" stroke-width="8"/>
              <circle class="ring-fill" id="gen-ring-fill" cx="60" cy="60" r="${r}" stroke-width="8"
                stroke-dasharray="${circumference}" stroke-dashoffset="${offset}"/>
            </svg>
            <div class="absolute inset-0 flex items-center justify-center">
              <span class="text-[28px] font-semibold tnum" id="gen-pct">${Math.round(project.progress)}%</span>
            </div>
          </div>

          <p class="text-[14px] leading-relaxed mb-8" id="gen-hero-msg" style="color:var(--color-ink-soft)">
            ${project.status === 'generating' ? LIVE_MESSAGES[project.liveMsgIdx] : `Готово ${project.materials.length} материалов, связанных одной учебной целью.`}
          </p>

          <div id="gen-failure-wrap" class="w-full text-left">${failureAlert ? `<div class="mb-4">${failureAlert}</div>` : ''}</div>

          <div class="card w-full p-4 text-left">
            <div class="text-[12.5px] font-medium mb-1" style="color:var(--color-ink-soft)">Материалы</div>
            <div id="gen-materials">${materialRows}</div>
          </div>

          <div id="gen-cta">${project.status === 'ready'
            ? `<a href="#/results/${project.id}" class="btn btn-primary mt-6">Открыть комплект урока ${icon('chevronRight', 'w-4 h-4')}</a>`
            : `<button class="btn btn-ghost btn-sm mt-6" data-action="cancel-generation" data-project="${project.id}">Продолжить позже</button>`}</div>
        </div>
      </section>
    </div>
  `;
}

function viewNotFound() {
  return shell({ title: 'Не найдено', body: emptyState('warn', 'Материал не найден', 'Возможно, он был удалён или ссылка устарела.') });
}

// ---------- VIEW: results (lesson package dashboard) ----------

// Which materials to suggest dropping first when a lesson package runs over its stated
// duration (TZ §27 Smart Time Control / §53) — core explanation + assessment stay last.
const REMOVABLE_PRIORITY = ['cards', 'detective', 'reflection', 'homework', 'worksheet', 'tasks3'];

function viewResults(id) {
  const project = findProject(id);
  if (!project) return viewNotFound();

  const cards = project.materials.map(m => materialCard(project, m)).join('');
  const readyCount = project.materials.filter(m => m.status === 'ready').length;

  const failedMaterial = project.materials.find(m => m.status === 'failed');
  const failureAlert = failedMaterial ? alertBanner({
    variant: 'danger',
    title: `Не удалось создать «${MATERIAL_TYPES[failedMaterial.key].label}»`,
    text: 'Остальные материалы готовы — можно продолжать работу, а этот пересоздать в любой момент.',
    actionsHtml: `<button class="btn btn-sm" style="background:var(--color-danger); color:var(--color-on-brand)" data-action="retry-material" data-project="${project.id}" data-material="${failedMaterial.key}">Повторить ${MATERIAL_TYPES[failedMaterial.key].label.toLowerCase()}</button>`,
  }) : '';

  const totalMinutes = project.materials.reduce((sum, m) => sum + estimateMinutes(m.key), 0);
  const removable = REMOVABLE_PRIORITY.filter(k => project.materials.some(m => m.key === k)).slice(0, 2);
  const overloadAlert = totalMinutes - project.duration > 5 && removable.length ? alertBanner({
    variant: 'warning',
    title: `Этот сценарий рассчитан примерно на ${totalMinutes} минут`,
    text: `Для урока на ${project.duration} минут материала слишком много. Предлагаем убрать: ${removable.map(k => `«${MATERIAL_TYPES[k].label}»`).join(', ')}.`,
    actionsHtml: `<button class="btn btn-sm" style="background:var(--color-warning); color:var(--color-on-brand)" data-action="optimize-duration" data-project="${project.id}">Сократить до ${project.duration} минут</button>`,
  }) : '';

  const qualityAlert = project.qualityCheckOpen ? alertBanner({
    variant: 'success',
    title: 'Проверка урока пройдена',
    text: 'Возрастная адекватность, сложность, повторения, ошибки, соответствие теме и цели, длительность, логичность структуры и качество вопросов — всё в норме.',
    closeAction: { action: 'dismiss-quality-check', attrs: `data-project="${project.id}"` },
  }) : '';

  const alertsHtml = [failureAlert, overloadAlert, qualityAlert].filter(Boolean).map(a => `<div class="mb-4">${a}</div>`).join('');

  return shell({
    title: esc(project.topic),
    subtitle: `${project.grade} класс, ${project.duration} минут, ${esc(project.subject)}`,
    wide: true,
    actions: `
      ${autosaveBadge()}
      <a href="#/teach/${project.id}" class="btn btn-secondary btn-sm">${icon('play', 'w-4 h-4')}Провести урок</a>
      <button class="btn btn-primary btn-sm" data-action="export-menu">${icon('download', 'w-4 h-4')}Экспорт</button>
    `,
    body: `
      <div class="enter">
        ${alertsHtml}
        <div class="flex flex-wrap items-center gap-4 mb-7">
          <div class="card px-4 py-3 flex items-center gap-3">
            ${icon('target', 'w-5 h-5')}
            <div>
              <div class="text-[12px]" style="color:var(--color-ink-soft)">Соответствие учебной цели</div>
              <div class="text-[16px] font-semibold tnum">${project.alignment}%</div>
            </div>
          </div>
          <div class="card px-4 py-3">
            <div class="text-[12px]" style="color:var(--color-ink-soft)">Готово материалов</div>
            <div class="text-[16px] font-semibold tnum">${readyCount} / ${project.materials.length}</div>
          </div>
          <button class="btn btn-secondary btn-sm" data-action="why-this">${icon('info', 'w-4 h-4')}Почему AI предложил это?</button>
          <button class="btn btn-secondary btn-sm" data-action="quality-check" data-project="${project.id}">${icon('check', 'w-4 h-4')}Проверить урок</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div>

        <div class="mt-8 card p-5">
          <div class="text-[13.5px] font-medium mb-3 flex items-center gap-2">${icon('layers', 'w-4 h-4')}Lesson Graph — связь с учебной целью</div>
          <div class="flex items-center gap-2 flex-wrap text-[13px]" style="color:var(--color-ink-soft)">
            <span class="chip" style="cursor:default">Учебная цель</span>${icon('chevronRight', 'w-4 h-4')}
            <span class="chip" style="cursor:default">Объяснение (презентация)</span>${icon('chevronRight', 'w-4 h-4')}
            <span class="chip" style="cursor:default">Практика (рабочий лист)</span>${icon('chevronRight', 'w-4 h-4')}
            <span class="chip" style="cursor:default">Задание (3 уровня)</span>${icon('chevronRight', 'w-4 h-4')}
            <span class="chip" style="cursor:default">Оценивание (quiz)</span>
          </div>
        </div>
      </div>
    `,
  });
}

// ---------- VIEW: editor ----------

function viewEditor(id, materialKey) {
  const project = findProject(id);
  if (!project) return viewNotFound();
  const material = project.materials.find(m => m.key === materialKey);
  if (!material) return viewNotFound();
  const t = MATERIAL_TYPES[materialKey];
  const vkey = id + '_' + materialKey;
  const version = state.versionCounter[vkey] || 1;

  const commands = ['Сделай проще', 'Сделай сложнее', 'Добавь примеры', 'Переведи на казахский', 'Добавь групповое задание', 'Сократи до 30 минут'];

  const body = editorBodyFor(project, materialKey);

  return `
    <div class="flex-1 min-w-0 grid" style="grid-template-columns: minmax(0,1fr) 340px">
      <section class="flex flex-col min-w-0">
        <header class="flex items-center justify-between gap-4 px-7 py-4 border-b" style="border-color:var(--color-border)">
          <div class="flex items-center gap-3 min-w-0">
            <a href="#/results/${project.id}" class="btn-ghost btn btn-sm" style="padding:6px">${icon('chevronLeft', 'w-4 h-4')}</a>
            <div class="min-w-0">
              <div class="font-semibold text-[15px] truncate">${t.label}, ${esc(project.topic)}</div>
              <div class="text-[12.5px]" style="color:var(--color-ink-soft)">Version ${version}, ${esc(project.language)}</div>
            </div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            ${autosaveBadge()}
            <button class="btn btn-secondary btn-sm" data-action="export-menu">${icon('download', 'w-4 h-4')}Экспорт</button>
          </div>
        </header>
        <div class="flex-1 overflow-y-auto scrollpane px-7 py-7">
          <div class="max-w-[760px] mx-auto enter">${body}</div>
        </div>
      </section>

      <aside class="border-l flex flex-col" style="border-color:var(--color-border)">
        <div class="px-5 py-4 border-b" style="border-color:var(--color-border)">
          <div class="text-[13px] font-medium flex items-center gap-2">${icon('sparkle', 'w-4 h-4')}AI-редактор</div>
        </div>
        <div class="px-5 py-4 flex-1 overflow-y-auto scrollpane">
          <div class="text-[12px] font-medium mb-2" style="color:var(--color-ink-soft)">Быстрые команды</div>
          <div class="flex flex-wrap gap-2 mb-6">
            ${commands.map(c => `<button class="chip" data-action="ai-edit" data-project="${project.id}" data-material="${materialKey}" data-cmd="${esc(c)}">${esc(c)}</button>`).join('')}
          </div>

          <div class="text-[12px] font-medium mb-2" style="color:var(--color-ink-soft)">История версий</div>
          <div class="flex flex-col gap-1.5 mb-6">
            ${Array.from({ length: version }, (_, i) => version - i).map(v => `
              <div class="flex items-center justify-between px-3 py-2 rounded-md text-[13px]" style="background:${v === version ? 'var(--color-brand-soft)' : 'transparent'}">
                <span class="flex items-center gap-2" style="color:${v === version ? 'var(--color-brand-dark)' : 'var(--color-ink)'}">${icon('history', 'w-3.5 h-3.5')}Version ${v}</span>
                ${v !== version ? `<button class="text-[12px] font-medium" style="color:var(--color-brand)" data-action="revert-version" data-project="${project.id}" data-material="${materialKey}" data-version="${v}">Вернуться</button>` : `<span class="text-[11.5px]" style="color:var(--color-brand-dark)">текущая</span>`}
              </div>
            `).join('')}
          </div>

          <div class="text-[12px] font-medium mb-2" style="color:var(--color-ink-soft)">Почему это задание?</div>
          <p class="text-[13px] leading-relaxed" style="color:var(--color-ink-soft)">
            Материал проверяет умение сравнивать причины и последствия, что соответствует заявленной учебной цели урока.
          </p>
        </div>
        <form class="px-4 py-3 border-t flex items-center gap-2" style="border-color:var(--color-border)" data-form="ai-edit-free" data-project="${project.id}" data-material="${materialKey}">
          <input type="text" placeholder="Напишите, что изменить..." class="flex-1 border rounded-md px-3 py-2 text-[13.5px] outline-none" style="border-color:var(--color-border)">
          <button class="btn btn-secondary btn-sm" type="submit" style="padding:8px">${icon('chevronRight', 'w-4 h-4')}</button>
        </form>
      </aside>
    </div>
  `;
}

function editorBodyFor(project, key) {
  const t = MATERIAL_TYPES[key];
  if (key === 'presentation') {
    const slides = ['Тема урока', 'Проблемный вопрос', 'Ключевое понятие', 'Пример', 'Визуализация', 'Групповая активность', 'Проверка понимания', 'Итог урока', 'Рефлексия'];
    return `<div class="grid grid-cols-2 sm:grid-cols-3 gap-4">
      ${slides.map((s, i) => `
        <div class="card p-4 aspect-[4/3] flex flex-col justify-between">
          <span class="text-[11px] tnum" style="color:var(--color-ink-faint)">${i + 1}</span>
          <span class="text-[13.5px] font-medium leading-snug">${s}</span>
        </div>
      `).join('')}
    </div>`;
  }
  if (key === 'quiz') {
    const qs = ['Какие причины привели к образованию ханства?', 'Кто был первым ханом?', 'В каком году произошло это событие?', 'Как это повлияло на дальнейшую историю региона?'];
    return `<div class="flex flex-col gap-4">
      ${qs.map((q, i) => `
        <div class="card p-4">
          <div class="text-[12px] mb-1.5" style="color:var(--color-ink-soft)">Вопрос ${i + 1}</div>
          <div class="text-[14.5px] font-medium">${q}</div>
        </div>
      `).join('')}
    </div>`;
  }
  if (key === 'tasks3') {
    return `<div class="flex flex-col gap-5">
      ${['A', 'B', 'C'].map((lvl, i) => `
        <div class="card p-5">
          <div class="flex items-center gap-2 mb-2">
            <span class="w-6 h-6 rounded-md flex items-center justify-center text-[12px] font-semibold" style="background:var(--color-brand-soft); color:var(--color-brand-dark)">${lvl}</span>
            <span class="text-[14px] font-medium">Level ${lvl} — ${['Поддерживающий уровень', 'Основной уровень', 'Продвинутый уровень'][i]}</span>
          </div>
          <p class="text-[13.5px] leading-relaxed" style="color:var(--color-ink-soft)">
            ${['Соотнесите даты и события на основе предложенной опоры-таймлайна.', 'Объясните своими словами причины образования ханства, используя два аргумента.', 'Сравните причины и последствия образования ханства с аналогичным процессом в соседнем регионе.'][i]}
          </p>
        </div>
      `).join('')}
    </div>`;
  }
  return `<div class="card p-6">
    <h3 class="text-[17px] font-semibold mb-4">${t.label}: ${esc(project.topic)}</h3>
    <div class="flex flex-col gap-3 text-[14.5px] leading-relaxed" style="color:var(--color-ink)">
      <p><strong>Класс:</strong> ${project.grade}, <strong>Предмет:</strong> ${esc(project.subject)}, <strong>Длительность:</strong> ${project.duration} мин</p>
      <p><strong>Учебная цель:</strong> ${esc(project.goal)}</p>
      <p><strong>Критерии оценивания:</strong> ученик называет причины события, объясняет связь между ними, приводит один самостоятельный пример.</p>
      <p><strong>Ход урока:</strong> разминка — объяснение — работа в группах — практика — рефлексия.</p>
      <p><strong>Дифференциация:</strong> три уровня заданий (A/B/C), поддержка для учеников, которым нужна помощь.</p>
    </div>
  </div>`;
}

// ---------- VIEW: my materials ----------

function viewMy() {
  const cards = state.projects.map(p => projectCard(p)).join('') || emptyState('folder', 'Пока нет материалов', 'Создайте первый проект на главной.');
  return shell({
    title: 'Мои материалы',
    subtitle: `${state.projects.length} проектов`,
    wide: true,
    actions: `<a href="#/create" class="btn btn-primary btn-sm">${icon('plus', 'w-4 h-4')}Новый материал</a>`,
    body: `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 enter">${cards}</div>`,
  });
}

// ---------- VIEW: templates & library ----------

function filterRow() {
  const filters = ['Предмет', 'Класс', 'Тип', 'Язык', 'Дата', 'Автор'];
  return `<div class="flex flex-wrap gap-2 mb-6">
    ${filters.map(f => `<button class="chip" type="button" data-action="toggle-filter" data-key="${f}">${f} ${icon('chevronDown', 'w-3.5 h-3.5')}</button>`).join('')}
    <div class="flex-1 min-w-[180px] relative">
      <span class="absolute left-3 top-1/2 -translate-y-1/2" style="color:var(--color-ink-faint)">${icon('search', 'w-4 h-4')}</span>
      <input type="search" placeholder="Поиск по шаблонам и материалам" class="w-full border rounded-md pl-9 pr-3 py-2 text-[13.5px] outline-none" style="border-color:var(--color-border)">
    </div>
  </div>`;
}

function templateCard(tpl) {
  const t = MATERIAL_TYPES[tpl.type];
  return `<div class="card card-hover p-5 flex flex-col gap-3">
    <div class="w-9 h-9 rounded-md flex items-center justify-center" style="background:var(--color-brand-soft); color:var(--color-brand-dark)">${icon(t.icon, 'w-[18px] h-[18px]')}</div>
    <div>
      <div class="font-medium text-[14.5px] leading-snug">${esc(tpl.title)}</div>
      <div class="text-[13px] mt-0.5" style="color:var(--color-ink-soft)">${esc(tpl.subject)}</div>
    </div>
    <div class="text-[12.5px]" style="color:var(--color-ink-soft)">${esc(tpl.author)}</div>
    <button class="btn btn-secondary btn-sm mt-1" data-action="remix-template" data-id="${tpl.id}">Адаптировать для моего класса</button>
  </div>`;
}

function viewTemplates() {
  const cards = TEMPLATES.map(templateCard).join('');
  return shell({
    title: 'Шаблоны',
    subtitle: 'Проверенные педагогические шаблоны',
    wide: true,
    body: `<div class="enter">${filterRow()}<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${cards}</div></div>`,
  });
}

function viewLibrary() {
  const tabs = [
    { key: 'templates', label: 'Шаблоны' },
    { key: 'favorites', label: 'Избранное' },
    { key: 'school', label: 'Школьная библиотека' },
    { key: 'colleagues', label: 'Материалы коллег' },
  ];
  const tabsHtml = tabs.map(t => `
    <button class="chip ${state.libraryTab === t.key ? 'is-selected' : ''}" data-action="library-tab" data-key="${t.key}">${t.label}</button>
  `).join('');

  const items = state.libraryTab === 'templates' ? TEMPLATES.map(templateCard).join('')
    : state.libraryTab === 'colleagues' ? TEMPLATES.slice(4).map(templateCard).join('')
    : state.libraryTab === 'school' ? TEMPLATES.slice(0, 4).map(templateCard).join('')
    : state.projects.map(p => projectCard(p)).join('');

  return shell({
    title: 'Библиотека',
    subtitle: 'Ваши материалы, школьные стандарты и избранное',
    wide: true,
    body: `<div class="enter">
      <div class="flex flex-wrap gap-2 mb-5">${tabsHtml}</div>
      ${filterRow()}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">${items}</div>
    </div>`,
  });
}

// ---------- VIEW: teach (select + runner) ----------

function viewTeachSelect() {
  const ready = state.projects.filter(p => p.status === 'ready');
  const cards = ready.map(p => `
    <div class="card card-hover p-5 flex flex-col gap-3">
      <div class="font-medium text-[15px]">${esc(p.topic)}</div>
      <div class="text-[13px]" style="color:var(--color-ink-soft)">${p.grade} класс, ${p.duration} минут</div>
      <a href="#/teach/${p.id}" class="btn btn-primary btn-sm mt-1">${icon('play', 'w-4 h-4')}Провести урок</a>
    </div>
  `).join('') || emptyState('play', 'Нет готовых уроков', 'Сначала создайте и доведите до готовности материалы урока.');
  return shell({
    title: 'Провести урок',
    subtitle: 'Выберите готовый урок, чтобы открыть режим проведения',
    wide: true,
    body: `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 enter">${cards}</div>`,
  });
}

function viewTeach(id) {
  const project = findProject(id);
  if (!project) return viewNotFound();
  const slides = ['Тема урока', 'Проблемный вопрос', 'Ключевое понятие', 'Пример', 'Визуализация', 'Групповая активность', 'Проверка понимания', 'Итог урока', 'Рефлексия'];
  const idx = project.teachSlide || 0;
  const sec = state.teachTimer.seconds;
  const mm = String(Math.floor(sec / 60)).padStart(2, '0');
  const ss = String(sec % 60).padStart(2, '0');

  return `
    <div class="flex-1 min-w-0 flex flex-col" style="background:var(--color-ink)">
      <header class="flex items-center justify-between px-6 py-3" style="border-bottom:1px solid var(--color-on-dark-border)">
        <a href="#/results/${project.id}" class="btn btn-ghost btn-sm" style="color:var(--color-on-brand)"> ${icon('close', 'w-4 h-4')} Завершить урок</a>
        <div class="text-[13px]" style="color:var(--color-on-dark-text-soft)">${esc(project.topic)}, ${project.grade} класс</div>
        <div class="flex items-center gap-3">
          <button class="btn btn-ghost btn-sm" style="color:var(--color-on-brand)" data-action="teach-timer-toggle">${icon(state.teachTimer.running ? 'circle' : 'play', 'w-4 h-4')}</button>
          <span class="tnum text-[15px] font-medium" style="color:var(--color-on-brand)">${mm}:${ss}</span>
        </div>
      </header>
      <div class="flex-1 grid" style="grid-template-columns: minmax(0,1fr) 300px">
        <div class="flex flex-col items-center justify-center p-10">
          <div class="w-full max-w-2xl aspect-[16/9] rounded-lg flex items-center justify-center" style="background:var(--color-teach-surface); border:1px solid var(--color-on-dark-border-weak)">
            <span class="text-[26px] font-semibold" style="color:var(--color-on-brand)">${slides[idx]}</span>
          </div>
          <div class="flex items-center gap-3 mt-5">
            <button class="btn btn-secondary btn-sm" data-action="teach-prev">${icon('chevronLeft', 'w-4 h-4')}</button>
            <span class="text-[13px] tnum" style="color:var(--color-on-dark-text-soft)">${idx + 1} / ${slides.length}</span>
            <button class="btn btn-secondary btn-sm" data-action="teach-next">${icon('chevronRight', 'w-4 h-4')}</button>
          </div>
        </div>
        <aside class="flex flex-col gap-3 p-4" style="border-left:1px solid var(--color-on-dark-border)">
          ${teachToolCard('shuffle', 'Случайный ученик', 'Выбрать')}
          ${teachToolCard('users', 'Группы', `${CLASS_PROFILE.size} учеников, 4 группы`)}
          ${teachToolCard('qr', 'QR для учеников', 'Показать QR')}
          ${teachToolCard('quiz', 'Quiz', 'Запустить live-сессию')}
          ${teachToolCard('trophy', 'Scoreboard', 'Открыть')}
        </aside>
      </div>
    </div>
  `;
}

function teachToolCard(iconName, label, action) {
  return `<button type="button" class="card p-3.5 flex items-center justify-between text-left" style="background:var(--color-teach-surface); border-color:var(--color-on-dark-border)" data-action="teach-tool" data-tool="${iconName}" data-label="${esc(label)}">
    <span class="flex items-center gap-2.5 text-[13.5px]" style="color:var(--color-on-brand)">${icon(iconName, 'w-4 h-4')}${label}</span>
    <span class="text-[12px]" style="color:var(--color-on-dark-text-faint)">${action}</span>
  </button>`;
}

// ---------- VIEW: analytics ----------

function viewAnalytics() {
  const stat = (label, value) => `<div class="card px-5 py-4">
    <div class="text-[12.5px]" style="color:var(--color-ink-soft)">${label}</div>
    <div class="text-[22px] font-semibold tnum mt-1">${value}</div>
  </div>`;

  const hardRows = ANALYTICS.hardTopics.map(h => `
    <div class="flex items-center justify-between py-2.5 border-b last:border-0" style="border-color:var(--color-border)">
      <span class="text-[13.5px]">${esc(h.topic)}</span>
      <span class="flex items-center gap-2">
        <span class="bar-track thin w-24"><div class="bar-fill" style="transform:scaleX(${h.score / 100}); background:${h.score < 50 ? 'var(--color-danger)' : 'var(--color-warning)'}"></div></span>
        <span class="text-[13px] tnum w-9 text-right" style="color:var(--color-ink-soft)">${h.score}%</span>
      </span>
    </div>
  `).join('');

  return shell({
    title: 'Аналитика',
    subtitle: 'Результаты по созданным материалам и проведённым урокам',
    wide: true,
    body: `
      <div class="enter">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-7">
          ${stat('Создано материалов', ANALYTICS.materialsCreated)}
          ${stat('Проведено уроков', ANALYTICS.lessonsRun)}
          ${stat('Использовано Quiz', ANALYTICS.quizzesUsed)}
          ${stat('Средний результат', ANALYTICS.avgResult + '%')}
        </div>
        <div class="card p-5">
          <div class="text-[13.5px] font-medium mb-3">Сложные темы</div>
          ${hardRows}
          <button class="btn btn-secondary btn-sm mt-4" data-action="followup-generate">${icon('sparkle', 'w-4 h-4')}Создать материал для повторения</button>
        </div>
      </div>
    `,
  });
}

// ---------- VIEW: settings ----------

function viewSettings() {
  return shell({
    title: 'Настройки',
    subtitle: 'Профиль, предпочтения и класс',
    body: `
      <div class="enter flex flex-col gap-5">
        <div class="card p-5">
          <div class="text-[13.5px] font-medium mb-3">Профиль учителя</div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${selectField('name', 'Имя', [TEACHER_PROFILE.name], TEACHER_PROFILE.name)}
            ${selectField('subjects', 'Предметы', TEACHER_PROFILE.subjects, TEACHER_PROFILE.subjects[0])}
            ${selectField('language', 'Язык интерфейса', TEACHER_PROFILE.languages, TEACHER_PROFILE.languages[0])}
            ${selectField('stylePref', 'Предпочитаемый стиль', ['Академический', 'Простой', 'Для школьника', 'Методический'], 'Методический')}
          </div>
        </div>
        <div class="card p-5">
          <div class="text-[13.5px] font-medium mb-3">Профиль класса «${CLASS_PROFILE.name}»</div>
          <p class="text-[12.5px] mb-3" style="color:var(--color-ink-soft)">Эти данные видите только вы — используются для автоматической дифференциации.</p>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="card py-3"><div class="text-[18px] font-semibold tnum">${CLASS_PROFILE.strong}</div><div class="text-[12px]" style="color:var(--color-ink-soft)">сильных</div></div>
            <div class="card py-3"><div class="text-[18px] font-semibold tnum">${CLASS_PROFILE.medium}</div><div class="text-[12px]" style="color:var(--color-ink-soft)">средних</div></div>
            <div class="card py-3"><div class="text-[18px] font-semibold tnum">${CLASS_PROFILE.support}</div><div class="text-[12px]" style="color:var(--color-ink-soft)">нужна поддержка</div></div>
          </div>
        </div>
      </div>
    `,
  });
}

// ---------- router ----------

function render() {
  const route = state.route;
  const parts = route.replace('#/', '').split('/');
  let html = '';

  if (parts[0] === 'home' || parts[0] === '') html = viewHome();
  else if (parts[0] === 'create') html = viewCreate();
  else if (parts[0] === 'generate' && parts[1]) html = viewGenerate(parts[1]);
  else if (parts[0] === 'results' && parts[1]) html = viewResults(parts[1]);
  else if (parts[0] === 'editor' && parts[1] && parts[2]) html = viewEditor(parts[1], parts[2]);
  else if (parts[0] === 'my') html = viewMy();
  else if (parts[0] === 'templates') html = viewTemplates();
  else if (parts[0] === 'library') html = viewLibrary();
  else if (parts[0] === 'teach' && parts[1]) html = viewTeach(parts[1]);
  else if (parts[0] === 'teach') html = viewTeachSelect();
  else if (parts[0] === 'analytics') html = viewAnalytics();
  else if (parts[0] === 'settings') html = viewSettings();
  else html = viewHome();

  $('#view-root').innerHTML = html;
  renderSidebar();
}

window.addEventListener('hashchange', () => {
  state.route = location.hash || '#/home';
  render();
});

// ---------- global interactions (event delegation) ----------

document.addEventListener('change', (e) => {
  const el = e.target.closest('[data-action="file-chosen"]');
  if (!el) return;
  const name = el.files && el.files[0] ? el.files[0].name : '';
  state.chosenFileName = name;
  if (name) toast(`Файл «${name}» загружен`, 'upload', 'success');
  render();
});

document.addEventListener('submit', (e) => {
  const form = e.target.closest('form');
  if (!form) return;
  e.preventDefault();

  if (form.dataset.form === 'home-create' || form.dataset.form === 'ai-create') {
    const fd = new FormData(form);
    const topic = (fd.get('topic') || '').toString().trim();
    const subject = (fd.get('subject') || state.selectedQuick.subject).toString();
    const grade = parseInt(fd.get('grade') || state.selectedQuick.grade, 10);
    const language = (fd.get('language') || state.selectedQuick.language).toString();

    const project = makeProject({
      topic: topic || 'Новая тема урока',
      subject, grade, language,
      duration: 45,
      status: 'generating',
      progress: 0,
      materials: makeMaterials(['ksp', 'tasks3', 'worksheet', 'presentation', 'quiz', 'reflection', 'homework']),
    });
    state.projects.unshift(project);
    startGeneration(project);
    location.hash = '#/generate/' + project.id;
    return;
  }

  if (form.dataset.form === 'refine-chat') {
    toast('Уточнение учтено — обновляем материал', 'sparkle');
    form.reset();
    return;
  }

  if (form.dataset.form === 'ai-edit-free') {
    const input = form.querySelector('input');
    applyAiEdit(form.dataset.project, form.dataset.material, input.value || 'Правка');
    input.value = '';
    return;
  }
});

document.addEventListener('click', (e) => {
  const actionEl = e.target.closest('[data-action]');
  if (!actionEl) return;
  const action = actionEl.dataset.action;

  switch (action) {
    case 'quick-create': {
      const key = actionEl.dataset.key;
      const topicGuess = { ksp: 'Новая тема — КСП', presentation: 'Новая тема — презентация', tasks3: 'Новая тема — задания', quiz: 'Новая тема — тест', worksheet: 'Новая тема — рабочий лист', detective: 'Новая тема — игра', adapt: 'Адаптация текста', reflection: 'Новая тема — рефлексия' }[key] || 'Новая тема';
      const project = makeProject({
        topic: topicGuess, status: 'generating', progress: 0,
        materials: makeMaterials([key === 'adapt' ? 'worksheet' : key]),
      });
      state.projects.unshift(project);
      startGeneration(project);
      location.hash = '#/generate/' + project.id;
      break;
    }
    case 'create-source':
      state.createSource = actionEl.dataset.key;
      render();
      break;
    case 'create-intent':
      state.createIntent = state.createIntent === actionEl.dataset.key ? null : actionEl.dataset.key;
      render();
      break;
    case 'toggle-more-params':
      state.showMoreParams = !state.showMoreParams;
      render();
      break;
    case 'library-tab':
      state.libraryTab = actionEl.dataset.key;
      render();
      break;
    case 'open-editor':
      location.hash = `#/editor/${actionEl.dataset.project}/${actionEl.dataset.material}`;
      break;
    case 'cancel-generation':
      toast('Вернуться можно в любой момент — прогресс сохранён', 'folder');
      location.hash = '#/my';
      break;
    case 'export-menu':
      toast('Экспорт: PDF, DOCX, PPTX, Google Docs, ссылка, QR', 'download');
      break;
    case 'why-this':
      toast('Задания проверяют именно цели урока, заявленные в КСП', 'info');
      break;
    case 'quality-check': {
      const p = findProject(actionEl.dataset.project);
      if (p) { p.qualityCheckOpen = true; render(); }
      break;
    }
    case 'dismiss-quality-check': {
      const p = findProject(actionEl.dataset.project);
      if (p) { p.qualityCheckOpen = false; render(); }
      break;
    }
    case 'optimize-duration': {
      const p = findProject(actionEl.dataset.project);
      if (p) {
        const drop = REMOVABLE_PRIORITY.filter(k => p.materials.some(m => m.key === k)).slice(0, 2);
        p.materials = p.materials.filter(m => !drop.includes(m.key));
        toast(`Материалы сокращены до ${p.duration} минут`, 'check', 'success');
        render();
      }
      break;
    }
    case 'retry-material': {
      const p = findProject(actionEl.dataset.project);
      const mat = p && p.materials.find(mm => mm.key === actionEl.dataset.material);
      if (mat) {
        mat.status = 'running';
        render();
        setTimeout(() => {
          mat.status = 'ready';
          toast(`«${MATERIAL_TYPES[mat.key].label}» успешно пересоздан`, 'check', 'success');
          render();
        }, 1400);
      }
      break;
    }
    case 'remix-template':
      toast('Шаблон скопирован в рабочее пространство для адаптации', 'sparkle');
      break;
    case 'followup-generate':
      toast('Создаём дополнительное задание по слабой теме', 'sparkle');
      break;
    case 'ai-edit':
      applyAiEdit(actionEl.dataset.project, actionEl.dataset.material, actionEl.dataset.cmd);
      break;
    case 'revert-version': {
      const vkey = actionEl.dataset.project + '_' + actionEl.dataset.material;
      state.versionCounter[vkey] = parseInt(actionEl.dataset.version, 10);
      toast('Возвращено к Version ' + actionEl.dataset.version, 'history');
      render();
      break;
    }
    case 'teach-timer-toggle':
      toggleTeachTimer();
      break;
    case 'teach-next': {
      const p = findProject(location.hash.split('/')[2]);
      if (p) { p.teachSlide = Math.min(8, (p.teachSlide || 0) + 1); render(); }
      break;
    }
    case 'teach-prev': {
      const p = findProject(location.hash.split('/')[2]);
      if (p) { p.teachSlide = Math.max(0, (p.teachSlide || 0) - 1); render(); }
      break;
    }
    case 'teach-tool': {
      const tool = actionEl.dataset.tool;
      const messages = {
        shuffle: () => `Выбран ученик №${1 + Math.floor(Math.random() * CLASS_PROFILE.size)}`,
        users: () => `Класс разделён на 4 группы (${CLASS_PROFILE.size} учеников)`,
        qr: () => 'QR-код показан на экране для учеников',
        quiz: () => 'Live-сессия quiz запущена — ученики видят PIN на экране',
        trophy: () => 'Scoreboard открыт',
      };
      toast((messages[tool] || (() => actionEl.dataset.label))(), tool);
      break;
    }
    case 'toggle-filter':
      actionEl.classList.toggle('is-selected');
      break;
  }
});

function applyAiEdit(projectId, materialKey, cmd) {
  const vkey = projectId + '_' + materialKey;
  state.versionCounter[vkey] = (state.versionCounter[vkey] || 1) + 1;
  toast(`Применено: «${cmd}» — создана Version ${state.versionCounter[vkey]}`, 'sparkle');
  render();
}

let teachInterval = null;
function toggleTeachTimer() {
  state.teachTimer.running = !state.teachTimer.running;
  if (state.teachTimer.running) {
    teachInterval = setInterval(() => { state.teachTimer.seconds++; render(); }, 1000);
  } else {
    clearInterval(teachInterval);
  }
  render();
}

// ---------- boot ----------

if (!location.hash) location.hash = '#/home';
state.route = location.hash;
render();
