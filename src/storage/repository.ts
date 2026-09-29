import { createSeed } from '../data/ai901-seed';
import type { StudyState } from '../domain/types';

/**
 * 儲存層的接縫。原型用 localStorage；整合進 Sophavia 時，
 * 改寫一個 SupabaseRepository 實作這個介面，UI 與 domain 不用動。
 */
export interface StudyRepository {
  load(): Promise<StudyState>;
  save(state: StudyState): Promise<void>;
}

export class LocalStorageRepository implements StudyRepository {
  constructor(private readonly key = 'sophavia.ai901.v1') {}

  async load(): Promise<StudyState> {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw) {
        const parsed = JSON.parse(raw) as StudyState;
        if (parsed.version === 1) return parsed;
      }
    } catch {
      // 讀不到（私密模式、資料損毀）就從初始資料開始
    }
    return createSeed();
  }

  async save(state: StudyState): Promise<void> {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      // 儲存失敗時保留記憶體中的狀態，不中斷操作
    }
  }
}
