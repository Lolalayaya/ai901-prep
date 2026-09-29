# AI-901 備考站(Sophavia 目標原型)

用 Sophavia 的資料模型,實際跑一個真實的學習目標:**2026/12/08 通過 Microsoft AI-901**。
這是作者自己的備考工具,也是 Sophavia 的第一個 dogfooding 案例——之後整合回 Sophavia 時,
這裡的資料等於「一位使用者建立的一個 Goal,加上它的 PlanTask、Resource、Note」。

## 執行

```bash
cd prototypes/ai901-prep
npm install
npm run dev      # 開發伺服器 http://localhost:5173
npm test         # domain 邏輯單元測試(Vitest)
npm run build    # 型別檢查 + 打包到 dist/
```

資料存在瀏覽器的 localStorage(key:`sophavia.ai901.v1`)。換瀏覽器或清除網站資料會回到初始計畫。

## 功能

| 分頁 | 內容 |
|---|---|
| 本週 | 倒數、連續打卡、目標完成度、本週時數條(目標 5–7 小時)、滾動調整建議、本週任務與週日復盤 |
| 全部計畫 | 目標狀態、3 個里程碑、10 個讀書週;可展開每週勾選、填實際時數、移到下週、新增任務 |
| 資源庫 | 官方文件、Learn 模組、題庫;固定分類＋自由標籤＋完成狀態 |
| 筆記 | Markdown 筆記,可連結任務或資源、標籤、搜尋、公開／私人(預設私人) |
| 錯題本 | 題目、答案、為什麼錯;依主題統計未複習的弱項 |
| 模擬考 | 成績紀錄與正確率長條圖(70% / 80% 目標線) |
| 考試日 | 考前 7 天、前一天、當天清單 |

## 滾動式調整規則

以每週 **5–7 小時**為準(`StudySettings.weeklyMinHours / weeklyMaxHours`),規則在 [`src/domain/rolling.ts`](src/domain/rolling.ts):

- 每週的預估時數落在 5–7 小時(週 0 就緒週與考前週例外),每項任務旁填實際分鐘數。
- **週結束後還有未完成項目** → 建議整批移到下一週(保留 `carriedFrom` 記錄原本在哪週)。
- **移過去後下週超過 7 小時** → 提醒延後標「可選」的任務,或把閱讀任務拆開。
- **實際時數少於 5 小時** → 下週先處理延後的任務,新內容少排一點。
- **實際時數超過 7 小時** → 提醒放慢,避免後段倦怠。
- **完成任務但沒填時數** → 提醒填寫,否則看不出這週有沒有落在區間內。

## 程式結構

```
src/
  domain/         純函式,不碰 DOM 與儲存 —— 整合時可以原封搬進 Sophavia
    types.ts        實體型別:Goal / Milestone / StudyWeek / PlanTask / Resource / Note / QuizMistake / MockExam
    progress.ts     完成度統計、目前週、上下週
    rolling.ts      每週負荷、滾動調整建議、carryOver
    streak.ts       連續打卡天數(issue 06 的規則)
    dates.ts        台北時間日期工具
    domain.test.ts  單元測試
  data/
    ai901-seed.ts   AI-901 讀書計畫的初始資料
  storage/
    repository.ts   StudyRepository 介面 + LocalStorageRepository
  ui/               原生 TS 字串模板;整合時會改寫成 React 元件
  main.ts           事件處理、存檔、重畫
```

## 對應 Sophavia MVP 規格

對照 [`.scratch/sophavia-mvp/spec.md`](../../.scratch/sophavia-mvp/spec.md):

| 規格 | 原型裡的對應 | 備註 |
|---|---|---|
| Goal + 里程碑 + 達成率 + 狀態(US 1–5) | `Goal`、`Milestone`、`goalTally` | 狀態:進行中／達成／放棄 |
| PlanTask 排程、手動記錄時間、選擇性綁定 Goal／Resource(US 6–10) | `PlanTask.weekId / goalId / resourceId / actualMinutes` | 以「讀書週」排程,沒有做到逐日行事曆 |
| Note:Markdown、連結任務／資源、標籤、公開開關、搜尋(US 11–15) | `Note`、`renderMarkdown` | 只支援常用 Markdown 語法 |
| Resource:固定分類、自由標籤、手動完成狀態(US 16–20) | `Resource`、`RESOURCE_CATEGORIES`、`RESOURCE_STATUSES` | 與規格的 enum 值相同 |
| 連續打卡天數(US 23、issue 06) | `currentStreak` | 今天還沒打卡不中斷;昨天沒打卡歸零 |
| 第二階段「結構化理解檢核」 | `QuizMistake`、`MockExam`、檢核點(`PlanTask.kind = 'check'`) | 規格列為 Out of Scope,這裡先試做,可作為第二階段的設計輸入 |
| 帳號與隱私(US 21–22) | 未做 | 等 Supabase Auth |

原型額外加了三個規格沒有的概念,整合前值得在 UX 流程裡驗證:

1. **StudyWeek(讀書週)**:比逐日行事曆更貼近「有空才讀」的節奏(見訪談 001:「有空的時候會稍微看一下」)。
2. **每週時數區間與滾動調整**:回應訪談 001 的「不知道從哪裡開始」——系統替使用者決定下週先做什麼。
3. **PlanTask.kind(任務／產出／檢核點)**:把「以為自己懂了」的痛點變成可勾選的檢核點。

## 整合回 Sophavia 的步驟

1. `src/domain/` 與 `src/data/` 直接搬到 Sophavia 的 Next.js 專案(例如 `src/lib/study/`),測試一起搬。
2. 寫 `SupabaseRepository` 實作 `StudyRepository`,或把 `StudyState` 拆成 `goals / milestones / plan_tasks / resources / notes` 資料表,每張表加 `user_id`。
3. `src/ui/` 的字串模板改寫成 React 元件;`styles.css` 的 token 換成 Sophavia 正式的 design token。
4. 依 [`docs/superpowers/plans/2026-08-02-ux-process-mvp-definition.md`](../../docs/superpowers/plans/2026-08-02-ux-process-mvp-definition.md),正式實作仍排在 Figma 原型通過可用性測試之後;這個原型可以當作 Figma 設計與可用性測試的素材。

## 發佈到 GitHub Pages

Sophavia 是私人 repo,所以網站放在另一個公開 repo `Lolalayaya/ai901-prep`,只包含這個資料夾的內容。
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) 在那個 repo 的根目錄才會執行:push 到 `main` 會自動測試、打包、部署。

在 Sophavia repo 根目錄更新網站:

```bash
git subtree split --prefix prototypes/ai901-prep -b ai901-pages
git push ai901 ai901-pages:main
git branch -D ai901-pages
```

第一次需要先加 remote:`git remote add ai901 https://github.com/Lolalayaya/ai901-prep.git`,
並在 ai901-prep 的 Settings → Pages → Build and deployment → Source 選 **GitHub Actions**。

網址:https://lolalayaya.github.io/ai901-prep/ 。網站是公開的,但每位訪客的進度只存在自己的瀏覽器。
