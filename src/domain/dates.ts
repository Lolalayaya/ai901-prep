import type { ISODate } from './types';

const TAIPEI_OFFSET_MS = 8 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

/** 台北時間的今天（YYYY-MM-DD） */
export function taipeiToday(now: Date = new Date()): ISODate {
  return new Date(now.getTime() + TAIPEI_OFFSET_MS).toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** 2026-10-05 → 10/5 */
export function shortDate(date: ISODate): string {
  const [, m, d] = date.split('-');
  return `${Number(m)}/${Number(d)}`;
}

/** 分鐘 → 小時字串，最多一位小數：90 → "1.5" */
export function hours(minutes: number): string {
  return String(Math.round((minutes / 60) * 10) / 10);
}
