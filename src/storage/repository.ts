import { createSeed } from '../data/ai901-seed';
import type { StudyState } from '../domain/types';
import { parseBackup } from './backup';

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
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(this.key);
    } catch {
      return createSeed(); // 私密模式等情況讀不到儲存空間
    }
    if (!raw) return createSeed();
    try {
      return parseBackup(raw).state;
    } catch {
      // 讀不懂的資料(格式改版、損毀)不直接丟掉,先另存一份再從初始計畫開始
      try {
        localStorage.setItem(`${this.key}.unreadable.${Date.now()}`, raw);
      } catch {
        // 空間不足時放棄另存
      }
      return createSeed();
    }
  }

  async save(state: StudyState): Promise<void> {
    try {
      localStorage.setItem(this.key, JSON.stringify(state));
    } catch {
      // 儲存失敗時保留記憶體中的狀態，不中斷操作
    }
  }
}
