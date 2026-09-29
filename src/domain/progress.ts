import type { ISODate, PlanTask, StudyState, StudyWeek } from './types';

export interface Tally {
  done: number;
  total: number;
  ratio: number;
}

export function tally(tasks: readonly PlanTask[]): Tally {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completedAt !== null).length;
  return { done, total, ratio: total ? done / total : 0 };
}

export function tasksOfWeek(tasks: readonly PlanTask[], weekId: string): PlanTask[] {
  return tasks.filter((t) => t.weekId === weekId);
}

function sorted(weeks: readonly StudyWeek[]): StudyWeek[] {
  return [...weeks].sort((a, b) => a.from.localeCompare(b.from));
}

/** 今天所在的讀書週；計畫開始前回傳第一週，結束後回傳最後一週 */
export function currentWeek(weeks: readonly StudyWeek[], today: ISODate): StudyWeek {
  const list = sorted(weeks);
  if (list.length === 0) throw new Error('沒有任何讀書週');
  const inRange = list.find((w) => today >= w.from && today <= w.to);
  if (inRange) return inRange;
  return list.find((w) => w.from > today) ?? list[list.length - 1];
}

export function nextWeek(weeks: readonly StudyWeek[], weekId: string): StudyWeek | null {
  const list = sorted(weeks);
  const i = list.findIndex((w) => w.id === weekId);
  return i >= 0 && i < list.length - 1 ? list[i + 1] : null;
}

export function previousWeek(weeks: readonly StudyWeek[], weekId: string): StudyWeek | null {
  const list = sorted(weeks);
  const i = list.findIndex((w) => w.id === weekId);
  return i > 0 ? list[i - 1] : null;
}

export function milestoneTally(state: StudyState, milestoneId: string): Tally {
  const weekIds = new Set(state.weeks.filter((w) => w.milestoneId === milestoneId).map((w) => w.id));
  return tally(state.tasks.filter((t) => weekIds.has(t.weekId)));
}

export function goalTally(state: StudyState): Tally {
  return tally(state.tasks.filter((t) => t.goalId === state.goal.id));
}
