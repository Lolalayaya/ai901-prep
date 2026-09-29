import './styles.css';
import { taipeiToday } from './domain/dates';
import { carryOver } from './domain/rolling';
import type { GoalStatus, Note, ResourceCategory, ResourceStatus, StudyState } from './domain/types';
import { BackupError, backupFilename, describeState, parseBackup, toBackup } from './storage/backup';
import { LocalStorageRepository, type StudyRepository } from './storage/repository';
import { esc, splitTags } from './ui/html';
import { initialUI, TABS, type Tab, type UIState } from './ui/ui-state';
import {
  renderExamDay, renderMistakes, renderMocks, renderNotes, renderPlan, renderResources, renderSummary, renderToday,
} from './ui/views';

const repo: StudyRepository = new LocalStorageRepository();
const ui: UIState = initialUI();
let state: StudyState;

const $ = (id: string) => document.getElementById(id)!;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** 改狀態 → 存檔 → 重畫。所有資料變更都走這裡。 */
function update(mutate: (s: StudyState) => void): void {
  mutate(state);
  void repo.save(state);
  render();
}

function render(): void {
  const today = taipeiToday();
  const focusId = document.activeElement?.id;
  $('goal-line').innerHTML = `${esc(state.goal.title)} · 考試日 <span class="mono">2026/12/08（二）20:30</span> · 目標狀態：${esc(state.goal.status)}`;
  $('summary').innerHTML = renderSummary(state, today);
  $('tabs').innerHTML = TABS.map((t) => {
    const n = t.id === 'mistakes' ? state.mistakes.filter((m) => !m.reviewed).length : t.id === 'mocks' ? state.mocks.length : t.id === 'notes' ? state.notes.length : null;
    return `<button type="button" class="tab" role="tab" id="tab-${t.id}" data-action="tab" data-tab="${t.id}" aria-selected="${ui.tab === t.id}">${t.label}${n !== null ? `<span class="n">${n}</span>` : ''}</button>`;
  }).join('');
  const views: Record<Tab, () => string> = {
    today: () => renderToday(state, today),
    plan: () => renderPlan(state, ui, today),
    resources: () => renderResources(state, ui),
    notes: () => renderNotes(state, ui),
    mistakes: () => renderMistakes(state, ui, today),
    mocks: () => renderMocks(state, today),
    examday: () => renderExamDay(),
  };
  $('view').innerHTML = views[ui.tab]();
  const again = focusId ? document.getElementById(focusId) : null;
  if (again) {
    again.focus();
    if (again instanceof HTMLInputElement && (again.type === 'search' || again.type === 'text')) {
      again.setSelectionRange(again.value.length, again.value.length);
    }
  }
}

function formData(form: HTMLFormElement): Record<string, string> {
  return Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, String(v).trim()]));
}

document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!el || el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') return;
  const { action, id = '', to = '', week = '' } = el.dataset;
  switch (action) {
    case 'tab':
      ui.tab = el.dataset.tab as Tab;
      render();
      break;
    case 'toggle-week':
      ui.openWeek = ui.openWeek === week ? '' : week;
      render();
      break;
    case 'open-week':
      ui.tab = 'plan';
      ui.openWeek = week;
      render();
      document.getElementById(`week-${week}`)?.scrollIntoView({ block: 'start' });
      break;
    case 'move-one':
      update((s) => { s.tasks = carryOver(s.tasks, [id], to); });
      break;
    case 'carry':
      update((s) => { s.tasks = carryOver(s.tasks, (el.dataset.ids ?? '').split(','), to); });
      break;
    case 'del-task':
      update((s) => { s.tasks = s.tasks.filter((t) => t.id !== id); });
      break;
    case 'res-filter':
      ui.resourceFilter = el.dataset.f ?? '全部';
      render();
      break;
    case 'del-resource':
      update((s) => {
        s.resources = s.resources.filter((r) => r.id !== id);
        s.tasks = s.tasks.map((t) => (t.resourceId === id ? { ...t, resourceId: null } : t));
        s.notes = s.notes.map((n) => (n.resourceId === id ? { ...n, resourceId: null } : n));
      });
      break;
    case 'note-tag':
      ui.noteTag = el.dataset.f ?? '全部';
      render();
      break;
    case 'select-note':
      ui.selectedNote = id;
      ui.editingNote = false;
      render();
      break;
    case 'new-note':
      ui.selectedNote = null;
      ui.editingNote = true;
      render();
      $('n-title').focus();
      break;
    case 'edit-note':
      ui.editingNote = true;
      render();
      break;
    case 'cancel-note':
      ui.editingNote = false;
      render();
      break;
    case 'del-note':
      ui.selectedNote = null;
      update((s) => { s.notes = s.notes.filter((n) => n.id !== id); });
      break;
    case 'mistake-filter':
      ui.mistakeFilter = el.dataset.f ?? '全部';
      render();
      break;
    case 'del-mistake':
      update((s) => { s.mistakes = s.mistakes.filter((m) => m.id !== id); });
      break;
    case 'del-mock':
      update((s) => { s.mocks = s.mocks.filter((m) => m.id !== id); });
      break;
  }
});

document.addEventListener('change', (e) => {
  const el = e.target as HTMLInputElement | HTMLSelectElement;
  const { action, id = '' } = el.dataset;
  const today = taipeiToday();
  switch (action) {
    case 'toggle-task': {
      const checked = (el as HTMLInputElement).checked;
      update((s) => { s.tasks = s.tasks.map((t) => (t.id === id ? { ...t, completedAt: checked ? today : null } : t)); });
      break;
    }
    case 'actual': {
      const minutes = Math.max(0, Math.round(Number(el.value) || 0));
      update((s) => { s.tasks = s.tasks.map((t) => (t.id === id ? { ...t, actualMinutes: minutes } : t)); });
      break;
    }
    case 'goal-status':
      update((s) => { s.goal.status = el.value as GoalStatus; });
      break;
    case 'res-status':
      update((s) => { s.resources = s.resources.map((r) => (r.id === id ? { ...r, status: el.value as ResourceStatus } : r)); });
      break;
    case 'mistake-reviewed': {
      const checked = (el as HTMLInputElement).checked;
      update((s) => { s.mistakes = s.mistakes.map((m) => (m.id === id ? { ...m, reviewed: checked } : m)); });
      break;
    }
  }
});

let reviewTimer: number | undefined;
document.addEventListener('input', (e) => {
  const el = e.target as HTMLInputElement | HTMLTextAreaElement;
  if (el.dataset.action === 'review') {
    // 打字時不重畫，停下來 0.6 秒後存檔
    const weekId = el.dataset.week!;
    state.reviews[weekId] = { weekId, text: el.value, updatedAt: new Date().toISOString() };
    clearTimeout(reviewTimer);
    reviewTimer = window.setTimeout(() => void repo.save(state), 600);
  } else if (el.dataset.action === 'note-query') {
    ui.noteQuery = el.value;
    render();
  }
});

document.addEventListener('submit', (e) => {
  const form = e.target as HTMLFormElement;
  const kind = form.dataset.form;
  if (!kind) return;
  e.preventDefault();
  const d = formData(form);
  const today = taipeiToday();
  switch (kind) {
    case 'add-task': {
      const weekId = form.dataset.week!;
      const week = state.weeks.find((w) => w.id === weekId)!;
      update((s) => {
        s.tasks.push({
          id: uid('u'), weekId, goalId: s.goal.id, milestoneId: week.milestoneId, resourceId: null, kind: 'task',
          title: d.title, plannedMinutes: Math.max(0, Number(d.minutes) || 0), actualMinutes: 0,
          completedAt: null, optional: false, carriedFrom: null,
        });
      });
      document.getElementById(`nt-${weekId}`)?.focus();
      break;
    }
    case 'add-resource':
      update((s) => {
        s.resources.push({ id: uid('r'), title: d.title, url: d.url, category: d.category as ResourceCategory, tags: splitTags(d.tags ?? ''), status: '未開始' });
      });
      break;
    case 'save-note': {
      const now = new Date().toISOString();
      const fields: Pick<Note, 'title' | 'body' | 'tags' | 'isPublic' | 'planTaskId' | 'resourceId'> = {
        title: d.title,
        body: (form.elements.namedItem('body') as HTMLTextAreaElement).value,
        tags: splitTags(d.tags ?? ''),
        isPublic: (form.elements.namedItem('isPublic') as HTMLInputElement).checked,
        planTaskId: d.planTaskId || null,
        resourceId: d.resourceId || null,
      };
      const existing = ui.selectedNote;
      const id = existing ?? uid('n');
      ui.selectedNote = id;
      ui.editingNote = false;
      update((s) => {
        s.notes = existing
          ? s.notes.map((n) => (n.id === existing ? { ...n, ...fields, updatedAt: now } : n))
          : [...s.notes, { id, ...fields, createdAt: now, updatedAt: now }];
      });
      break;
    }
    case 'add-mistake':
      update((s) => {
        s.mistakes.push({ id: uid('q'), date: d.date || today, topic: d.topic, source: d.source, question: d.question, answer: d.answer, why: d.why, reviewed: false });
      });
      break;
    case 'add-mock': {
      const correct = Number(d.correct), total = Number(d.total);
      const right = form.elements.namedItem('correct') as HTMLInputElement;
      if (correct > total) {
        right.setCustomValidity('答對題數不能大於總題數');
        right.reportValidity();
        right.addEventListener('input', () => right.setCustomValidity(''), { once: true });
        return;
      }
      update((s) => { s.mocks.push({ id: uid('k'), date: d.date || today, source: d.source, correct, total, timed: d.timed === '1' }); });
      break;
    }
  }
});

// ---------- 匯入／匯出備份 ----------
const LAST_EXPORT_KEY = 'sophavia.ai901.lastExport';
let pendingImport: StudyState | null = null;

function readLastExport(): string | null {
  try { return localStorage.getItem(LAST_EXPORT_KEY); } catch { return null; }
}

function renderBackupNote(): void {
  const last = readLastExport();
  const note = $('backup-note');
  if (!last) {
    note.textContent = '資料只存在這個瀏覽器，還沒有備份過';
    note.parentElement!.dataset.s = 'warn';
    return;
  }
  const days = Math.floor((Date.now() - Date.parse(last)) / 864e5);
  note.textContent = `上次備份：${days === 0 ? '今天' : `${days} 天前`}`;
  note.parentElement!.dataset.s = days >= 7 ? 'warn' : 'ok';
}

function showMessage(html: string, tone: 'ok' | 'warn' | 'info'): void {
  const box = $('data-msg');
  box.className = `data-msg ${tone}`;
  box.innerHTML = html;
  box.hidden = false;
}

function exportBackup(): void {
  const now = new Date();
  const blob = new Blob([toBackup(state, now)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = backupFilename(now);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  try { localStorage.setItem(LAST_EXPORT_KEY, now.toISOString()); } catch { /* 記不住備份時間不影響匯出 */ }
  renderBackupNote();
  showMessage(`<span>已匯出 <b>${esc(a.download)}</b>，內容：${esc(describeState(state))}。建議存到雲端硬碟，換電腦時用「匯入備份」還原。</span><button type="button" class="link" data-action="msg-close">關閉</button>`, 'ok');
}

async function readImportFile(file: File): Promise<void> {
  try {
    const { state: incoming, exportedAt } = parseBackup(await file.text());
    pendingImport = incoming;
    const when = exportedAt ? `（${esc(new Date(exportedAt).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' }))} 匯出）` : '';
    showMessage(`<span>要用 <b>${esc(file.name)}</b>${when} 取代目前的資料嗎？<br>備份內容：${esc(describeState(incoming))}。<br>目前資料：${esc(describeState(state))}，取代後無法復原，需要的話先匯出一份。</span>
      <span class="acts"><button type="button" class="btn small" data-action="import-confirm">取代目前資料</button><button type="button" class="btn ghost" data-action="import-cancel">取消</button></span>`, 'info');
  } catch (err) {
    pendingImport = null;
    const msg = err instanceof BackupError ? err.message : '讀取檔案時發生錯誤，請確認選的是備考站匯出的 .json 檔。';
    showMessage(`<span>匯入失敗：${esc(msg)}</span><button type="button" class="link" data-action="msg-close">關閉</button>`, 'warn');
  }
}

$('btn-export').addEventListener('click', exportBackup);
$('btn-import').addEventListener('click', () => ($('import-file') as HTMLInputElement).click());
$('import-file').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) void readImportFile(file);
});
document.addEventListener('click', (e) => {
  const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
  const action = el?.dataset.action;
  if (action === 'import-confirm' && pendingImport) {
    state = pendingImport;
    pendingImport = null;
    Object.assign(ui, initialUI());
    void repo.save(state);
    render();
    showMessage(`<span>已匯入備份：${esc(describeState(state))}。</span><button type="button" class="link" data-action="msg-close">關閉</button>`, 'ok');
  } else if (action === 'import-cancel' || action === 'msg-close') {
    pendingImport = null;
    $('data-msg').hidden = true;
  }
});

async function boot(): Promise<void> {
  state = await repo.load();
  render();
  renderBackupNote();
  // 倒數每分鐘更新；只重畫摘要列，不影響正在輸入的欄位
  window.setInterval(() => { $('summary').innerHTML = renderSummary(state, taipeiToday()); }, 60_000);
}

void boot();
