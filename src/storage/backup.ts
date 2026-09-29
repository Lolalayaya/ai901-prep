import type { StudyState } from '../domain/types';

// 匯入／匯出備份檔。格式:{ app, exportedAt, state }。
// 整合進 Sophavia 後，這份 JSON 也可以當作搬到 Supabase 的匯入來源。

export const BACKUP_APP = 'sophavia-ai901';

export interface BackupFile {
  app: typeof BACKUP_APP;
  exportedAt: string;
  state: StudyState;
}

export function toBackup(state: StudyState, now: Date = new Date()): string {
  const file: BackupFile = { app: BACKUP_APP, exportedAt: now.toISOString(), state };
  return JSON.stringify(file, null, 2);
}

export function backupFilename(now: Date = new Date()): string {
  const d = new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  return `ai901-備份-${d}.json`;
}

export class BackupError extends Error {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const LISTS = { milestones: '里程碑', weeks: '讀書週', tasks: '任務', resources: '資源', notes: '筆記', mistakes: '錯題', mocks: '模擬考' } as const;

/** 檢查並讀出備份內容；接受備份檔格式，也接受直接存下來的 StudyState */
export function parseBackup(text: string): { state: StudyState; exportedAt: string | null } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new BackupError('這個檔案不是有效的 JSON，可能不是備考站匯出的備份。');
  }
  let exportedAt: string | null = null;
  if (isObj(data) && data.app === BACKUP_APP) {
    exportedAt = typeof data.exportedAt === 'string' ? data.exportedAt : null;
    data = data.state;
  }
  if (!isObj(data) || !('version' in data)) throw new BackupError('檔案裡找不到備考資料，這可能不是備考站匯出的備份檔。');
  if (data.version !== 1) throw new BackupError(`備份的資料版本是 ${String(data.version)}，這個版本的網站只能讀取版本 1。`);
  if (!isObj(data.goal) || !isObj(data.settings) || !isObj(data.reviews)) throw new BackupError('備份缺少目標、設定或復盤資料，檔案可能不完整。');
  for (const [key, label] of Object.entries(LISTS)) {
    if (!Array.isArray(data[key])) throw new BackupError(`備份缺少「${label}」清單，檔案可能不完整。`);
  }
  return { state: data as unknown as StudyState, exportedAt };
}

export function describeState(state: StudyState): string {
  const done = state.tasks.filter((t) => t.completedAt).length;
  return `${state.tasks.length} 項任務（完成 ${done} 項）、${state.notes.length} 則筆記、${state.mistakes.length} 筆錯題、${state.mocks.length} 次模擬考`;
}
