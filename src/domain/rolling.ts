import { hours } from './dates';
import { nextWeek, tasksOfWeek } from './progress';
import type { ISODate, PlanTask, StudySettings, StudyState } from './types';

// 滾動式調整：每週以 settings 的時數區間（預設 5–7 小時）為準，
// 週末檢視實際時數與未完成項目，產生下週的調整建議。

export type LoadBand = 'under' | 'ok' | 'over';

export interface WeekLoad {
  plannedMinutes: number;
  actualMinutes: number;
  remainingMinutes: number;
  band: LoadBand;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function weekLoad(tasks: readonly PlanTask[], settings: StudySettings): WeekLoad {
  const plannedMinutes = sum(tasks.map((t) => t.plannedMinutes));
  const actualMinutes = sum(tasks.map((t) => t.actualMinutes));
  const remainingMinutes = sum(tasks.filter((t) => !t.completedAt).map((t) => t.plannedMinutes));
  const band: LoadBand =
    plannedMinutes < settings.weeklyMinHours * 60
      ? 'under'
      : plannedMinutes > settings.weeklyMaxHours * 60
        ? 'over'
        : 'ok';
  return { plannedMinutes, actualMinutes, remainingMinutes, band };
}

export type Suggestion =
  | { kind: 'carry-over'; message: string; taskIds: string[]; toWeekId: string }
  | { kind: 'overload'; message: string; weekId: string }
  | { kind: 'under-time'; message: string }
  | { kind: 'over-time'; message: string }
  | { kind: 'log-time'; message: string }
  | { kind: 'pull-ahead'; message: string; weekId: string }
  | { kind: 'on-track'; message: string };

export function reviewWeek(state: StudyState, weekId: string, today: ISODate): Suggestion[] {
  const week = state.weeks.find((w) => w.id === weekId);
  if (!week) return [];
  const { weeklyMinHours: min, weeklyMaxHours: max } = state.settings;
  const tasks = tasksOfWeek(state.tasks, weekId);
  const load = weekLoad(tasks, state.settings);
  const next = nextWeek(state.weeks, weekId);
  const ended = today > week.to;
  const unfinished = tasks.filter((t) => !t.completedAt);
  const out: Suggestion[] = [];

  if (tasks.some((t) => t.completedAt && t.kind === 'task') && load.actualMinutes === 0) {
    out.push({ kind: 'log-time', message: '已經完成任務，但還沒填實際花費時間。填了才看得出這週有沒有落在 5–7 小時。' });
  }

  if (ended && unfinished.length > 0 && next) {
    out.push({
      kind: 'carry-over',
      message: `${week.label}還有 ${unfinished.length} 項沒完成（約 ${hours(load.remainingMinutes)} 小時），可以移到${next.label}繼續。`,
      taskIds: unfinished.map((t) => t.id),
      toWeekId: next.id,
    });
    const after = weekLoad([...tasksOfWeek(state.tasks, next.id), ...unfinished], state.settings);
    if (after.plannedMinutes > max * 60) {
      out.push({
        kind: 'overload',
        weekId: next.id,
        message: `移過去後${next.label}會排到 ${hours(after.plannedMinutes)} 小時，超過每週 ${max} 小時上限。建議把標「可選」的任務延後，或把閱讀任務拆到再下一週。`,
      });
    }
  }

  if (!ended && load.band === 'over') {
    out.push({
      kind: 'overload',
      weekId,
      message: `${week.label}目前排了 ${hours(load.plannedMinutes)} 小時，超過每週 ${max} 小時上限。建議把標「可選」或非核心的任務移到下一週。`,
    });
  }

  if (ended && load.actualMinutes > 0 && load.actualMinutes < min * 60) {
    out.push({
      kind: 'under-time',
      message: `這週實際讀了 ${hours(load.actualMinutes)} 小時，少於 ${min} 小時。下週先處理延後的任務，新內容可以少排一點。`,
    });
  }

  if (load.actualMinutes > max * 60) {
    out.push({
      kind: 'over-time',
      message: `這週已經讀了 ${hours(load.actualMinutes)} 小時，超過 ${max} 小時。可以放慢一點，避免後面幾週倦怠。`,
    });
  }

  if (tasks.length > 0 && unfinished.length === 0 && next) {
    out.push({
      kind: 'pull-ahead',
      weekId: next.id,
      message: `這週的項目都完成了。還有餘力的話，可以先看${next.label}的閱讀任務。`,
    });
  }

  if (out.length === 0) {
    out.push({
      kind: 'on-track',
      message: ended
        ? '這週照計畫完成。'
        : `照計畫進行中：還剩 ${unfinished.length} 項，約 ${hours(load.remainingMinutes)} 小時。`,
    });
  }
  return out;
}

/** 把任務移到另一週；carriedFrom 保留最初排定的週 */
export function carryOver(tasks: readonly PlanTask[], taskIds: readonly string[], toWeekId: string): PlanTask[] {
  const ids = new Set(taskIds);
  return tasks.map((t) =>
    ids.has(t.id) && t.weekId !== toWeekId
      ? { ...t, weekId: toWeekId, carriedFrom: t.carriedFrom ?? t.weekId }
      : t,
  );
}
