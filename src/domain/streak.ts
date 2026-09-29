import { addDays } from './dates';
import type { ISODate, PlanTask } from './types';

/**
 * 連續打卡天數（對應 issue 06）：某天至少完成一項 PlanTask 就算打卡。
 * 今天還沒打卡不會中斷連續天數；昨天沒打卡則歸零。
 */
export function currentStreak(tasks: readonly PlanTask[], today: ISODate): number {
  const days = new Set(tasks.map((t) => t.completedAt).filter((d): d is ISODate => d !== null));
  let day = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export function checkedInToday(tasks: readonly PlanTask[], today: ISODate): boolean {
  return tasks.some((t) => t.completedAt === today);
}
