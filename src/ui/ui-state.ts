export type Tab = 'today' | 'plan' | 'resources' | 'notes' | 'mistakes' | 'mocks' | 'examday';

export const TABS: { id: Tab; label: string }[] = [
  { id: 'today', label: '本週' },
  { id: 'plan', label: '全部計畫' },
  { id: 'resources', label: '資源庫' },
  { id: 'notes', label: '筆記' },
  { id: 'mistakes', label: '錯題本' },
  { id: 'mocks', label: '模擬考' },
  { id: 'examday', label: '考試日' },
];

/** 只屬於這次瀏覽的畫面狀態,不存檔 */
export interface UIState {
  tab: Tab;
  openWeek: string | null;
  resourceFilter: string;
  noteQuery: string;
  noteTag: string;
  selectedNote: string | null;
  editingNote: boolean;
  mistakeFilter: string;
}

export const initialUI = (): UIState => ({
  tab: 'today',
  openWeek: null,
  resourceFilter: '全部',
  noteQuery: '',
  noteTag: '全部',
  selectedNote: null,
  editingNote: false,
  mistakeFilter: '全部',
});

export const MISTAKE_TOPICS = [
  'Responsible AI', 'AI 工作負載', '機器學習', '電腦視覺', '文件理解', 'NLP', '語音',
  '生成式 AI', 'RAG／提示', 'Agent', 'Foundry 操作', '其他',
];
