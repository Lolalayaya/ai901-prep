// 實體命名對齊 .scratch/sophavia-mvp/spec.md 的 Goal / PlanTask / Note / Resource。
// QuizMistake、MockExam 對應 spec「第二階段：結構化理解檢核」，先在這個原型試做。

/** YYYY-MM-DD，以台北時間計算的日期 */
export type ISODate = string;

export type GoalStatus = '進行中' | '達成' | '放棄';

export interface Goal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  /** 目標期限（考試時間），ISO 8601 含時區 */
  targetAt: string;
}

/** 目標的里程碑；這個原型用來表示三個讀書階段 */
export interface Milestone {
  id: string;
  goalId: string;
  title: string;
  description: string;
  order: number;
}

/** 一個讀書週，PlanTask 以 weekId 排進某一週 */
export interface StudyWeek {
  id: string;
  label: string;
  title: string;
  from: ISODate;
  to: ISODate;
  milestoneId: string;
}

/** task = 要做的事；output = 這週的產出；check = 檢核點（驗收自己懂了沒） */
export type PlanTaskKind = 'task' | 'output' | 'check';

export interface PlanTask {
  id: string;
  weekId: string;
  goalId: string | null;
  milestoneId: string | null;
  resourceId: string | null;
  kind: PlanTaskKind;
  title: string;
  plannedMinutes: number;
  actualMinutes: number;
  completedAt: ISODate | null;
  optional: boolean;
  /** 滾動調整時記下最初排在哪一週 */
  carriedFrom: string | null;
}

export type ResourceCategory = '書籍' | '線上課程' | '影片' | '文章' | '其他';
export type ResourceStatus = '未開始' | '進行中' | '完成';

export const RESOURCE_CATEGORIES: readonly ResourceCategory[] = ['書籍', '線上課程', '影片', '文章', '其他'];
export const RESOURCE_STATUSES: readonly ResourceStatus[] = ['未開始', '進行中', '完成'];

export interface Resource {
  id: string;
  title: string;
  url: string;
  category: ResourceCategory;
  tags: string[];
  status: ResourceStatus;
}

export interface Note {
  id: string;
  title: string;
  /** Markdown 純文字 */
  body: string;
  tags: string[];
  isPublic: boolean;
  planTaskId: string | null;
  resourceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizMistake {
  id: string;
  date: ISODate;
  topic: string;
  source: string;
  question: string;
  answer: string;
  why: string;
  reviewed: boolean;
}

export interface MockExam {
  id: string;
  date: ISODate;
  source: string;
  correct: number;
  total: number;
  timed: boolean;
}

export interface WeekReview {
  weekId: string;
  text: string;
  updatedAt: string;
}

export interface StudySettings {
  /** 每週讀書時數下限與上限，滾動調整以這個區間為準 */
  weeklyMinHours: number;
  weeklyMaxHours: number;
}

export interface StudyState {
  version: 1;
  settings: StudySettings;
  goal: Goal;
  milestones: Milestone[];
  weeks: StudyWeek[];
  tasks: PlanTask[];
  resources: Resource[];
  notes: Note[];
  mistakes: QuizMistake[];
  mocks: MockExam[];
  reviews: Record<string, WeekReview>;
}
