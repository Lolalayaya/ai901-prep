import type {
  Goal, Milestone, Note, PlanTask, PlanTaskKind, QuizMistake, Resource, StudyState, StudyWeek,
} from '../domain/types';

// AI-901 讀書計畫的初始資料。每週預估時數落在 5–7 小時（週 0 與考前週除外）。
// 整合進 Sophavia 時，這份資料等於「一位使用者建立的一個 Goal + 它的 PlanTask 與 Resource」。

const GOAL_ID = 'goal-ai901';
const learn = (q: string) => `https://learn.microsoft.com/training/browse/?terms=${encodeURIComponent(q)}`;

const goal: Goal = {
  id: GOAL_ID,
  title: '通過 Microsoft AI-901 考試',
  description: 'Azure AI Fundamentals。10 週準備，每週 5–7 小時，依實際進度滾動調整。',
  status: '進行中',
  targetAt: '2026-12-08T20:30:00+08:00',
};

const milestones: Milestone[] = [
  { id: 'm1', goalId: GOAL_ID, order: 1, title: '環境＋核心概念', description: 'Responsible AI、ML、電腦視覺、NLP' },
  { id: 'm2', goalId: GOAL_ID, order: 2, title: '生成式 AI＋Foundry 實作', description: '部署、Agent、整合專案' },
  { id: 'm3', goalId: GOAL_ID, order: 3, title: '總複習＋模擬考', description: '錯題本、模擬題、衝刺' },
];

const resources: Resource[] = [
  { id: 'r-exam', title: 'AI-901 考試頁', url: 'https://learn.microsoft.com/credentials/certifications/exams/ai-901/', category: '文章', tags: ['官方'], status: '未開始' },
  { id: 'r-guide', title: 'AI-901 學習指南（考綱）', url: 'https://learn.microsoft.com/credentials/certifications/resources/study-guides/ai-901', category: '文章', tags: ['官方', '考綱'], status: '未開始' },
  { id: 'r-azure', title: 'Azure 免費帳號', url: 'https://azure.microsoft.com/free/', category: '其他', tags: ['環境'], status: '未開始' },
  { id: 'r-foundry', title: 'Microsoft Foundry 入口', url: 'https://ai.azure.com/', category: '其他', tags: ['Foundry', '環境'], status: '未開始' },
  { id: 'r-l-foundry', title: 'Learn：Get started with Azure AI Foundry', url: learn('Get started with Azure AI Foundry'), category: '線上課程', tags: ['Foundry'], status: '未開始' },
  { id: 'r-rai', title: 'Microsoft Responsible AI', url: 'https://www.microsoft.com/ai/responsible-ai', category: '文章', tags: ['Responsible AI'], status: '未開始' },
  { id: 'r-l-ml', title: 'Learn：machine learning types', url: learn('Understand machine learning types'), category: '線上課程', tags: ['機器學習'], status: '未開始' },
  { id: 'r-l-cv', title: 'Learn：computer vision workloads', url: learn('Explore computer vision workloads'), category: '線上課程', tags: ['電腦視覺'], status: '未開始' },
  { id: 'r-l-cu', title: 'Learn：Content Understanding', url: learn('Azure Content Understanding'), category: '線上課程', tags: ['文件理解'], status: '未開始' },
  { id: 'r-l-di', title: 'Learn：Document Intelligence', url: learn('Document Intelligence'), category: '線上課程', tags: ['文件理解'], status: '未開始' },
  { id: 'r-l-nlp', title: 'Learn：natural language processing', url: learn('Explore natural language processing workloads'), category: '線上課程', tags: ['NLP', '語音'], status: '未開始' },
  { id: 'r-l-genai', title: 'Learn：generative AI workloads', url: learn('Explore generative AI workloads'), category: '線上課程', tags: ['生成式 AI', 'RAG'], status: '未開始' },
  { id: 'r-l-deploy', title: 'Learn：Deploy a model in Foundry', url: learn('Deploy a model in Azure AI Foundry'), category: '線上課程', tags: ['Foundry', '生成式 AI'], status: '未開始' },
  { id: 'r-l-agent', title: 'Learn：Build an agent in Foundry', url: learn('Build an agent in Azure AI Foundry'), category: '線上課程', tags: ['Agent', 'Foundry'], status: '未開始' },
  { id: 'r-examinotion', title: 'Examinotion AI-901', url: 'https://examinotion.com/study-guide/ai-901', category: '其他', tags: ['模擬題'], status: '未開始' },
  { id: 'r-mindmesh', title: 'MindMesh AI-901', url: 'https://www.mindmeshacademy.com/certifications/azure/ai-901-microsoft-azure-ai-fundamentals/study-guide', category: '其他', tags: ['模擬題'], status: '未開始' },
  { id: 'r-mscertquiz', title: 'How to pass AI-901 first try', url: 'https://mscertquiz.com/blog/how-to-pass-ai-901-first-try', category: '文章', tags: ['備考心得'], status: '未開始' },
];

interface Item { kind: PlanTaskKind; title: string; minutes: number; resourceId?: string; optional?: boolean }
const t = (title: string, minutes: number, resourceId?: string, optional = false): Item => ({ kind: 'task', title, minutes, resourceId, optional });
const o = (title: string): Item => ({ kind: 'output', title, minutes: 0 });
const c = (title: string): Item => ({ kind: 'check', title, minutes: 0 });

interface WeekDef extends StudyWeek { items: Item[] }

const weekDefs: WeekDef[] = [
  { id: 'w0', label: '週 0', title: '就緒週', from: '2026-09-29', to: '2026-10-04', milestoneId: 'm1', items: [
    t('註冊 Azure 免費帳號', 20, 'r-azure'),
    t('註冊／登入 Microsoft Foundry', 20, 'r-foundry'),
    t('完成 2 個 Foundry 入門沙盒模組', 120, 'r-l-foundry'),
    t('建立筆記與錯題本', 30),
    t('做 12 題起點自測，錯題記進錯題本', 50),
    c('能在 Foundry 看到 Models／Deployments／Agents 頁籤'),
    c('筆記與錯題本已建立'),
  ] },
  { id: 'w1', label: '週 1', title: 'Responsible AI＋AI 工作負載', from: '2026-10-05', to: '2026-10-11', milestoneId: 'm1', items: [
    t('讀 Responsible AI 六原則', 120, 'r-rai'),
    t('讀 AI 工作負載分類（預測、CV、NLP、決策、生成式 AI）', 120, 'r-guide'),
    t('在 Foundry 瀏覽模型目錄，記錄 3 個模型的用途、輸入輸出、限制', 120, 'r-foundry'),
    o('1 頁 Responsible AI 筆記'),
    o('1 頁模型目錄觀察（3 個模型）'),
    c('能用 5 句話說明 Responsible AI 原則'),
    c('模型目錄觀察包含 3 個模型的用途與限制'),
  ] },
  { id: 'w2', label: '週 2', title: 'ML 基礎＋評估指標', from: '2026-10-12', to: '2026-10-18', milestoneId: 'm1', items: [
    t('讀監督／非監督、分類／回歸／分群', 90, 'r-l-ml'),
    t('讀訓練／驗證／測試資料切分、過擬合', 60, 'r-l-ml'),
    t('讀指標：accuracy、precision／recall、F1、RMSE', 90, 'r-l-ml'),
    t('完成 Learn 沙盒或 Foundry 快速分類示例', 120, 'r-l-ml'),
    o('1 頁 ML 流程筆記＋1 頁指標速查'),
    c('能解釋 precision 與 recall 的差異，以及何時重視哪一個'),
    c('實作沙盒完成並截圖'),
  ] },
  { id: 'w3', label: '週 3', title: '電腦視覺＋文件理解', from: '2026-10-19', to: '2026-10-25', milestoneId: 'm1', items: [
    t('讀影像分類、物件偵測、影像分割、OCR', 100, 'r-l-cv'),
    t('讀文件理解（表單、收據、名片）', 80, 'r-l-di'),
    t('用 Content Understanding 或 Document Intelligence 解析一份表單或收據', 180, 'r-l-cu'),
    o('小專案 v1：上傳文件 → 擷取欄位 → 結果截圖'),
    c('能說明物件偵測與影像分類的差別（是否輸出座標框）'),
    c('文件理解實作成功擷取至少 3 個欄位'),
  ] },
  { id: 'w4', label: '週 4', title: 'NLP＋語音', from: '2026-10-26', to: '2026-11-01', milestoneId: 'm1', items: [
    t('讀情感分析、實體辨識、翻譯、摘要', 110, 'r-l-nlp'),
    t('讀語音轉文字、文字轉語音', 70, 'r-l-nlp'),
    t('在 Foundry 呼叫一個 NLP 模型（情感分析或摘要）', 180, 'r-foundry'),
    o('小專案 v2：文字輸入 → 情感／摘要 → 結果截圖，記錄 prompt 與輸出'),
    c('能解釋情感分析與實體辨識的差異'),
    c('NLP 實作成功並記錄 prompt 與輸出'),
  ] },
  { id: 'w5', label: '週 5', title: '生成式 AI＋RAG＋提示設計', from: '2026-11-02', to: '2026-11-08', milestoneId: 'm2', items: [
    t('讀 LLM、prompt 設計、幻覺', 90, 'r-l-genai'),
    t('讀 RAG 與內容安全', 90, 'r-l-genai'),
    t('在 Foundry 部署一個 LLM，做基本 prompt 測試', 120, 'r-l-deploy'),
    t('串接檢索，體驗 RAG 流程', 60, 'r-l-genai', true),
    o('小專案 v3：問答或對話，含正確性與安全性的簡單評估'),
    c('能說明 RAG 的目的（結合檢索與生成以提升準確）'),
    c('LLM 部署成功，並記錄 3 個 prompt 測試案例'),
  ] },
  { id: 'w6', label: '週 6', title: 'Foundry Agent＋整合專案', from: '2026-11-09', to: '2026-11-15', milestoneId: 'm2', items: [
    t('讀 Agent 定義、工具呼叫、流程編排', 120, 'r-l-agent'),
    t('在 Foundry 建立一個 Agent，串接文件理解或 NLP', 240, 'r-l-agent'),
    o('整合專案 v4:Figma 原型＋Foundry 截圖，展示端到端流程'),
    c('Agent 能成功呼叫工具並回傳結果'),
    c('Figma 原型能說明使用者流程與 UI 重點'),
  ] },
  { id: 'w7', label: '週 7', title: '總複習＋第一輪模擬題', from: '2026-11-16', to: '2026-11-22', milestoneId: 'm3', items: [
    t('做 AI-901 練習題，成績記到「模擬考」', 210, 'r-examinotion'),
    t('複習錯題本＋筆記速查', 150),
    o('錯題本第一輪複習完成'),
    c('模擬題正確率達 70% 以上'),
    c('錯題本已複習至少 1 輪'),
  ] },
  { id: 'w8', label: '週 8', title: '補強＋第二輪模擬', from: '2026-11-23', to: '2026-11-29', milestoneId: 'm3', items: [
    t('針對錯題本弱項補強', 150),
    t('再做 1–2 套模擬題', 150, 'r-mindmesh'),
    t('複習 Foundry 實作步驟（部署、Agent、Content Understanding）', 60, 'r-foundry'),
    c('弱項主題錯誤率下降'),
    c('模擬題正確率 80% 以上'),
  ] },
  { id: 'w9', label: '週 9', title: '衝刺', from: '2026-11-30', to: '2026-12-06', milestoneId: 'm3', items: [
    t('每天 30 分鐘：快速複習筆記＋錯題本', 210),
    t('做 1 套完整計時模擬題', 90),
    t('確認考試環境（線上考）或考場路線', 30, 'r-exam'),
    c('模擬題正確率穩定 80% 以上'),
    c('考試環境測試完成'),
  ] },
  { id: 'wx', label: '考前', title: '考前一天＋考試日', from: '2026-12-07', to: '2026-12-08', milestoneId: 'm3', items: [
    t('12/7 輕複習：Responsible AI、Foundry 部署流程、常見指標', 60),
    t('12/7 只看錯題本與筆記，不做新題', 30),
    t('12/7 確認網路、攝影機、麥克風（線上考）', 20),
    t('12/8 提前 30 分鐘登入，測試環境', 30),
    c('完成 AI-901 考試'),
  ] },
];

const mistakes: QuizMistake[] = [
  {
    id: 'q-ocr', date: '2026-09-29', topic: '電腦視覺', source: '起點自測 第 4 題',
    question: 'OCR 屬於哪一類 AI 工作負載？', answer: '電腦視覺',
    why: 'OCR 從影像中讀出文字，輸入是影像，所以歸電腦視覺，不是 NLP。', reviewed: false,
  },
];

const notes: Note[] = [
  {
    id: 'n-cheatsheet', title: '考前速查', tags: ['速查'], isPublic: false, planTaskId: null, resourceId: 'r-guide',
    createdAt: '2026-09-29T00:00:00+08:00', updatedAt: '2026-09-29T00:00:00+08:00',
    body: [
      '## Responsible AI 六原則',
      '- 公平、可靠與安全、隱私與安全性、包容、透明、問責',
      '',
      '## 評估指標',
      '- **Precision**：預測為正的，有多少真的是正',
      '- **Recall**：真的是正的，有多少被抓到',
      '',
      '## 容易混淆',
      '- 影像分類 vs 物件偵測：物件偵測會輸出座標框',
      '- OCR 屬於電腦視覺',
      '- RAG：先檢索相關資料再生成，降低幻覺',
    ].join('\n'),
  },
];

export function createSeed(): StudyState {
  const weeks: StudyWeek[] = weekDefs.map(({ items: _items, ...w }) => w);
  const tasks: PlanTask[] = weekDefs.flatMap((w) =>
    w.items.map((it, i) => ({
      id: `${w.id}-${it.kind[0]}${i}`,
      weekId: w.id,
      goalId: GOAL_ID,
      milestoneId: w.milestoneId,
      resourceId: it.resourceId ?? null,
      kind: it.kind,
      title: it.title,
      plannedMinutes: it.minutes,
      actualMinutes: 0,
      completedAt: null,
      optional: it.optional ?? false,
      carriedFrom: null,
    })),
  );
  return structuredClone({
    version: 1,
    settings: { weeklyMinHours: 5, weeklyMaxHours: 7 },
    goal, milestones, weeks, tasks, resources, notes, mistakes,
    mocks: [], reviews: {},
  });
}
