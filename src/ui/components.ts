import { hours, shortDate } from '../domain/dates';
import { nextWeek, tally, tasksOfWeek } from '../domain/progress';
import { type Suggestion, weekLoad } from '../domain/rolling';
import type { ISODate, PlanTask, PlanTaskKind, StudyState, StudyWeek } from '../domain/types';
import { esc, safeUrl } from './html';

const KIND_LABEL: Record<PlanTaskKind, string> = { task: '任務', output: '產出', check: '檢核點' };

export function weekLabel(state: StudyState, weekId: string): string {
  return state.weeks.find((w) => w.id === weekId)?.label ?? weekId;
}

/** 本週時數條：0–10 小時刻度，淺色帶是 5–7 小時目標區間 */
export function loadBar(state: StudyState, week: StudyWeek): string {
  const { weeklyMinHours: min, weeklyMaxHours: max } = state.settings;
  const load = weekLoad(tasksOfWeek(state.tasks, week.id), state.settings);
  const scale = Math.max(10, load.plannedMinutes / 60, load.actualMinutes / 60);
  const pct = (h: number) => `${Math.min(100, (h / scale) * 100)}%`;
  const bandNote = load.band === 'over' ? `<span class="warn">超過 ${max} 小時</span>` : load.band === 'under' ? `少於 ${min} 小時` : '在目標區間內';
  return `<div class="load">
    <div class="load-track" aria-hidden="true">
      <span class="load-band" style="left:${pct(min)};width:calc(${pct(max)} - ${pct(min)})"></span>
      <span class="load-plan" style="width:${pct(load.plannedMinutes / 60)}"></span>
      <span class="load-act" style="width:${pct(load.actualMinutes / 60)}"></span>
    </div>
    <div class="load-legend">
      <span><i class="k-plan"></i>預估 <b class="mono">${hours(load.plannedMinutes)}</b> 小時（${bandNote}）</span>
      <span><i class="k-act"></i>實際 <b class="mono">${hours(load.actualMinutes)}</b> 小時</span>
      <span><i class="k-band"></i>目標 ${min}–${max} 小時</span>
    </div>
  </div>`;
}

function taskRow(state: StudyState, t: PlanTask): string {
  const res = t.resourceId ? state.resources.find((r) => r.id === t.resourceId) : undefined;
  const next = nextWeek(state.weeks, t.weekId);
  const meta: string[] = [];
  if (t.optional) meta.push('<span class="chip">可選</span>');
  if (t.carriedFrom) meta.push(`<span class="chip carried">從${esc(weekLabel(state, t.carriedFrom))}移來</span>`);
  if (t.kind === 'task') {
    meta.push(`<span>預估 <span class="mono">${t.plannedMinutes}</span> 分</span>`);
    meta.push(`<label class="actual" for="act-${t.id}">實際 <input type="number" min="0" step="5" inputmode="numeric" id="act-${t.id}" data-action="actual" data-id="${t.id}" value="${t.actualMinutes || ''}" placeholder="0"> 分</label>`);
  }
  if (res) meta.push(`<a href="${safeUrl(res.url)}" target="_blank" rel="noopener">${esc(res.title)} ↗</a>`);
  if (!t.completedAt && next) meta.push(`<button type="button" class="link move" data-action="move-one" data-id="${t.id}" data-to="${next.id}">移到${esc(next.label)}</button>`);
  if (t.id.startsWith('u-')) meta.push(`<button type="button" class="link danger" data-action="del-task" data-id="${t.id}">刪除</button>`);
  return `<li class="task ${t.kind} ${t.completedAt ? 'is-done' : ''}">
    <label class="task-main"><input type="checkbox" id="cb-${t.id}" data-action="toggle-task" data-id="${t.id}" ${t.completedAt ? 'checked' : ''}><span>${esc(t.title)}</span></label>
    ${meta.length ? `<div class="task-meta">${meta.join('')}</div>` : ''}
  </li>`;
}

export function suggestionList(suggestions: Suggestion[], state: StudyState): string {
  if (!suggestions.length) return '';
  return `<ul class="sugs">${suggestions.map((s) => {
    const tone = s.kind === 'on-track' || s.kind === 'pull-ahead' ? 'ok' : s.kind === 'overload' || s.kind === 'over-time' ? 'warn' : 'info';
    const action = s.kind === 'carry-over'
      ? `<button type="button" class="btn small" data-action="carry" data-ids="${s.taskIds.join(',')}" data-to="${s.toWeekId}">全部移到${esc(weekLabel(state, s.toWeekId))}</button>`
      : s.kind === 'overload' || s.kind === 'pull-ahead'
        ? `<button type="button" class="link" data-action="open-week" data-week="${s.weekId}">看${esc(weekLabel(state, s.weekId))}</button>`
        : '';
    return `<li class="sug ${tone}"><span>${esc(s.message)}</span>${action}</li>`;
  }).join('')}</ul>`;
}

export function weekBody(state: StudyState, week: StudyWeek): string {
  const tasks = tasksOfWeek(state.tasks, week.id);
  const groups = (['task', 'output', 'check'] as const)
    .map((k) => {
      const list = tasks.filter((t) => t.kind === k);
      if (!list.length) return '';
      return `<div class="grp"><h4>${KIND_LABEL[k]}</h4><ul class="chk">${list.map((t) => taskRow(state, t)).join('')}</ul></div>`;
    })
    .join('');
  const review = state.reviews[week.id]?.text ?? '';
  return `${loadBar(state, week)}
    ${groups}
    <form class="addtask" data-form="add-task" data-week="${week.id}">
      <label class="sr" for="nt-${week.id}">新增任務</label>
      <input id="nt-${week.id}" name="title" required placeholder="新增任務，例如：補看 NLP 模組第 3 單元">
      <label class="mins" for="nm-${week.id}"><input id="nm-${week.id}" name="minutes" type="number" min="0" step="5" value="30"> 分</label>
      <button class="btn small" type="submit">加入${esc(week.label)}</button>
    </form>
    <div class="grp"><h4><label for="rv-${week.id}">週日復盤</label></h4>
      <textarea class="note" id="rv-${week.id}" data-action="review" data-week="${week.id}" placeholder="這週卡在哪？下週要調整什麼？">${esc(review)}</textarea>
    </div>`;
}

export function weekStatusChip(state: StudyState, week: StudyWeek, today: ISODate, currentId: string): string {
  const p = tally(tasksOfWeek(state.tasks, week.id));
  if (p.total && p.done === p.total) return '<span class="chip done">已完成</span>';
  if (week.id === currentId) return '<span class="chip now">本週</span>';
  if (today > week.to && p.done < p.total) return '<span class="chip late">待調整</span>';
  return '';
}

export const dateRange = (w: StudyWeek) => `${shortDate(w.from)}–${shortDate(w.to)}`;
