import { describe, expect, it } from 'vitest';
import { createSeed } from '../data/ai901-seed';
import { addDays, taipeiToday } from './dates';
import { currentWeek, tasksOfWeek } from './progress';
import { carryOver, reviewWeek, weekLoad } from './rolling';
import { currentStreak } from './streak';
import type { PlanTask, StudyState } from './types';

function task(over: Partial<PlanTask>): PlanTask {
  return {
    id: 'x', weekId: 'w1', goalId: null, milestoneId: null, resourceId: null, kind: 'task',
    title: 't', plannedMinutes: 60, actualMinutes: 0, completedAt: null, optional: false, carriedFrom: null,
    ...over,
  };
}

describe('dates', () => {
  it('uses Taipei time for today', () => {
    expect(taipeiToday(new Date('2026-09-29T17:00:00Z'))).toBe('2026-09-30');
  });
  it('adds days across month boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  });
});

describe('currentStreak', () => {
  it('counts consecutive days ending today', () => {
    const ts = ['2026-10-01', '2026-10-02', '2026-10-03'].map((d, i) => task({ id: String(i), completedAt: d }));
    expect(currentStreak(ts, '2026-10-03')).toBe(3);
  });
  it('keeps the streak when today is not checked in yet', () => {
    const ts = ['2026-10-01', '2026-10-02'].map((d, i) => task({ id: String(i), completedAt: d }));
    expect(currentStreak(ts, '2026-10-03')).toBe(2);
  });
  it('resets after a missed day', () => {
    const ts = [task({ completedAt: '2026-10-01' })];
    expect(currentStreak(ts, '2026-10-03')).toBe(0);
  });
  it('ignores unfinished tasks and counts a day once', () => {
    const ts = [task({ id: 'a', completedAt: '2026-10-03' }), task({ id: 'b', completedAt: '2026-10-03' }), task({ id: 'c' })];
    expect(currentStreak(ts, '2026-10-03')).toBe(1);
  });
});

describe('seed plan', () => {
  const s = createSeed();
  it('keeps every regular week inside the 5–7 hour budget', () => {
    for (const w of s.weeks.filter((w) => !['w0', 'wx'].includes(w.id))) {
      expect(weekLoad(tasksOfWeek(s.tasks, w.id), s.settings).band, w.id).toBe('ok');
    }
  });
  it('finds the current week by Taipei date', () => {
    expect(currentWeek(s.weeks, '2026-09-29').id).toBe('w0');
    expect(currentWeek(s.weeks, '2026-10-12').id).toBe('w2');
    expect(currentWeek(s.weeks, '2026-09-01').id).toBe('w0');
    expect(currentWeek(s.weeks, '2027-01-01').id).toBe('wx');
  });
});

describe('reviewWeek', () => {
  const base = (): StudyState => createSeed();

  it('suggests carrying unfinished items to next week once the week ends', () => {
    const s = base();
    const sug = reviewWeek(s, 'w1', '2026-10-12');
    const carry = sug.find((x) => x.kind === 'carry-over');
    expect(carry && carry.kind === 'carry-over' && carry.toWeekId).toBe('w2');
    expect(carry && carry.kind === 'carry-over' && carry.taskIds.length).toBe(tasksOfWeek(s.tasks, 'w1').length);
  });

  it('warns when carried work pushes next week past the max hours', () => {
    const sug = reviewWeek(base(), 'w1', '2026-10-12');
    expect(sug.some((x) => x.kind === 'overload')).toBe(true);
  });

  it('warns while the current week is planned past the max hours', () => {
    const s = base();
    s.tasks = carryOver(s.tasks, tasksOfWeek(s.tasks, 'w1').map((t) => t.id), 'w2');
    const sug = reviewWeek(s, 'w2', '2026-10-13');
    expect(sug.find((x) => x.kind === 'overload')).toMatchObject({ weekId: 'w2' });
    expect(sug.some((x) => x.kind === 'on-track')).toBe(false);
  });

  it('does not suggest carry-over while the week is still running', () => {
    const sug = reviewWeek(base(), 'w1', '2026-10-08');
    expect(sug.map((x) => x.kind)).toEqual(['on-track']);
  });

  it('asks to log time when tasks are done without minutes', () => {
    const s = base();
    s.tasks = s.tasks.map((t) => (t.weekId === 'w1' && t.kind === 'task' ? { ...t, completedAt: '2026-10-06' } : t));
    expect(reviewWeek(s, 'w1', '2026-10-08').some((x) => x.kind === 'log-time')).toBe(true);
  });

  it('flags a finished week that stayed under the minimum hours', () => {
    const s = base();
    s.tasks = s.tasks.map((t) => (t.weekId === 'w1' ? { ...t, completedAt: '2026-10-06', actualMinutes: t.kind === 'task' ? 60 : 0 } : t));
    const kinds = reviewWeek(s, 'w1', '2026-10-12').map((x) => x.kind);
    expect(kinds).toContain('under-time');
    expect(kinds).toContain('pull-ahead');
  });
});

describe('carryOver', () => {
  it('moves tasks and remembers the original week', () => {
    const ts = [task({ id: 'a', weekId: 'w1' }), task({ id: 'b', weekId: 'w1' })];
    const once = carryOver(ts, ['a'], 'w2');
    const twice = carryOver(once, ['a'], 'w3');
    expect(twice[0]).toMatchObject({ weekId: 'w3', carriedFrom: 'w1' });
    expect(twice[1]).toMatchObject({ weekId: 'w1', carriedFrom: null });
  });
});
