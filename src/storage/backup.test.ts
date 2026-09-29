import { describe, expect, it } from 'vitest';
import { createSeed } from '../data/ai901-seed';
import { BackupError, backupFilename, parseBackup, toBackup } from './backup';

describe('backup', () => {
  it('round-trips the full state', () => {
    const s = createSeed();
    s.tasks[0].completedAt = '2026-09-29';
    s.mocks.push({ id: 'k1', date: '2026-11-20', source: 'Examinotion', correct: 30, total: 40, timed: true });
    const { state, exportedAt } = parseBackup(toBackup(s, new Date('2026-09-29T12:00:00Z')));
    expect(state).toEqual(s);
    expect(exportedAt).toBe('2026-09-29T12:00:00.000Z');
  });

  it('also accepts a raw saved state', () => {
    expect(parseBackup(JSON.stringify(createSeed())).exportedAt).toBeNull();
  });

  it('names the file by Taipei date', () => {
    expect(backupFilename(new Date('2026-10-04T17:00:00Z'))).toBe('ai901-備份-2026-10-05.json');
  });

  it.each([
    ['not json', '{oops'],
    ['wrong version', JSON.stringify({ ...createSeed(), version: 2 })],
    ['missing list', JSON.stringify({ ...createSeed(), tasks: undefined })],
    ['unrelated json', JSON.stringify({ hello: 'world' })],
  ])('rejects %s with a readable error', (_name, text) => {
    expect(() => parseBackup(text)).toThrow(BackupError);
  });
});
