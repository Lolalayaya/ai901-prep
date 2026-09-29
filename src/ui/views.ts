import { hours, shortDate } from '../domain/dates';
import { currentWeek, goalTally, milestoneTally, previousWeek, tally, tasksOfWeek } from '../domain/progress';
import { reviewWeek, weekLoad } from '../domain/rolling';
import { checkedInToday, currentStreak } from '../domain/streak';
import { type ISODate, RESOURCE_CATEGORIES, RESOURCE_STATUSES, type StudyState } from '../domain/types';
import { dateRange, suggestionList, weekBody, weekLabel, weekStatusChip } from './components';
import { esc, renderMarkdown, safeUrl } from './html';
import { MISTAKE_TOPICS, type UIState } from './ui-state';

export function renderSummary(state: StudyState, today: ISODate, now = new Date()): string {
  const ms = Date.parse(state.goal.targetAt) - now.getTime();
  const days = Math.floor(ms / 864e5);
  const hrs = Math.floor((ms % 864e5) / 36e5);
  const countdown = ms > 0
    ? `<span class="big">${days}<small>天</small> ${hrs}<small>小時</small></span><span class="sub">台北時間 ${esc(state.goal.targetAt.slice(5, 10).replace('-', '/'))} ${esc(state.goal.targetAt.slice(11, 16))}</span>`
    : '<span class="big">考完了</span><span class="sub">記得回來寫這次的心得</span>';
  const streak = currentStreak(state.tasks, today);
  const done = checkedInToday(state.tasks, today);
  const g = goalTally(state);
  const week = currentWeek(state.weeks, today);
  const load = weekLoad(tasksOfWeek(state.tasks, week.id), state.settings);
  const wt = tally(tasksOfWeek(state.tasks, week.id));
  return `
    <div><span class="label">距離考試</span>${countdown}</div>
    <div><span class="label">連續打卡</span><span class="big">${streak}<small>天</small></span>
      <span class="sub">${done ? '今天已打卡' : '今天完成任一項就算打卡'}</span></div>
    <div><span class="label">目標完成度</span><span class="big">${Math.round(g.ratio * 100)}<small>%</small></span>
      <div class="bar"><span style="width:${g.ratio * 100}%"></span></div><span class="sub">${g.done} / ${g.total} 項</span></div>
    <div><span class="label">${esc(week.label)}時數</span><span class="big">${hours(load.actualMinutes)}<small>/ ${hours(load.plannedMinutes)} 小時</small></span>
      <div class="bar"><span class="now" style="width:${wt.ratio * 100}%"></span></div><span class="sub">${wt.done} / ${wt.total} 項 · 目標 ${state.settings.weeklyMinHours}–${state.settings.weeklyMaxHours} 小時</span></div>`;
}

export function renderToday(state: StudyState, today: ISODate): string {
  const week = currentWeek(state.weeks, today);
  const prev = previousWeek(state.weeks, week.id);
  const prevSug = prev ? reviewWeek(state, prev.id, today).filter((s) => ['carry-over', 'overload', 'under-time'].includes(s.kind)) : [];
  return `<div class="today">
    <section>
      <div class="sec-h">
        <div><span class="label">${esc(week.label)} · ${dateRange(week)}</span><h2>${esc(week.title)}</h2></div>
      </div>
      ${prevSug.length ? `<div class="panel"><h3>${esc(prev!.label)}的滾動調整</h3>${suggestionList(prevSug, state)}</div>` : ''}
      <div class="panel"><h3>本週狀態</h3>${suggestionList(reviewWeek(state, week.id, today), state)}</div>
      <div class="weekbody">${weekBody(state, week)}</div>
    </section>
    <aside class="side">
      ${weakTopics(state)}
      <div class="box"><h3>滾動調整怎麼運作</h3><ul>
        <li>每週預估 <b>5–7 小時</b>，每項任務旁邊填實際花了幾分鐘。</li>
        <li>一週結束後還沒完成的項目，「本週」頁會提示整批移到下一週。</li>
        <li>移過去超過 7 小時，就先延後標「可選」的任務，或把閱讀任務拆開。</li>
        <li>每週日花 15 分鐘寫「週日復盤」。</li>
      </ul></div>
    </aside>
  </div>`;
}

function weakTopics(state: StudyState): string {
  const count = new Map<string, number>();
  for (const m of state.mistakes) if (!m.reviewed) count.set(m.topic, (count.get(m.topic) ?? 0) + 1);
  const rows = [...count].sort((a, b) => b[1] - a[1]);
  return `<div class="box"><h3>弱項（未複習錯題）</h3><ul class="weak">${
    rows.length ? rows.map(([t, n]) => `<li><span>${esc(t)}</span><span class="mono">${n}</span></li>`).join('') : '<li>目前沒有未複習的錯題。</li>'
  }</ul></div>`;
}

export function renderPlan(state: StudyState, ui: UIState, today: ISODate): string {
  const cur = currentWeek(state.weeks, today);
  const open = ui.openWeek ?? cur.id;
  const g = goalTally(state);
  const milestones = [...state.milestones].sort((a, b) => a.order - b.order);
  return `<section class="goalcard">
      <div class="goal-h">
        <div><span class="label">目標</span><h2>${esc(state.goal.title)}</h2><p>${esc(state.goal.description)}</p></div>
        <label class="field inline" for="goal-status">狀態
          <select id="goal-status" data-action="goal-status">${(['進行中', '達成', '放棄'] as const).map((s) => `<option ${s === state.goal.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
        </label>
      </div>
      <div class="bar"><span style="width:${g.ratio * 100}%"></span></div>
      <div class="milestones">${milestones.map((m) => {
        const t = milestoneTally(state, m.id);
        const ws = state.weeks.filter((w) => w.milestoneId === m.id);
        return `<div class="ms"><div class="seg">${ws.map((w) => {
          const p = tally(tasksOfWeek(state.tasks, w.id));
          return `<b class="${p.ratio === 1 ? 'done' : ''} ${w.id === cur.id ? 'now' : ''}" style="--p:${Math.round(p.ratio * 100)}%" title="${esc(w.label)} ${esc(w.title)}"></b>`;
        }).join('')}</div>
        <span><strong>里程碑 ${m.order} · ${esc(m.title)}</strong>${esc(m.description)} · ${t.done}/${t.total}</span></div>`;
      }).join('')}</div>
    </section>
    <div class="weeks">${state.weeks.map((w) => {
      const p = tally(tasksOfWeek(state.tasks, w.id));
      const load = weekLoad(tasksOfWeek(state.tasks, w.id), state.settings);
      const isOpen = open === w.id;
      return `<article class="wk ${w.id === cur.id ? 'is-now' : ''}" id="week-${w.id}">
        <button type="button" class="wk-h" data-action="toggle-week" data-week="${w.id}" aria-expanded="${isOpen}">
          <span class="wk-no">${esc(w.label)}</span><span class="wk-t">${esc(w.title)}</span>
          <span class="wk-meta"><span class="mono">${dateRange(w)}</span><span>預估 ${hours(load.plannedMinutes)} 小時${load.band === 'over' ? ' <span class="warn">超量</span>' : ''}</span></span>
          <span class="wk-r"><span class="mono">${p.done}/${p.total}</span>${weekStatusChip(state, w, today, cur.id)}</span>
        </button>
        ${isOpen ? `<div class="wk-b">${suggestionList(reviewWeek(state, w.id, today).filter((s) => s.kind !== 'on-track'), state)}${weekBody(state, w)}</div>` : ''}
      </article>`;
    }).join('')}</div>`;
}

export function renderResources(state: StudyState, ui: UIState): string {
  const tags = [...new Set(state.resources.flatMap((r) => r.tags))];
  const filters = ['全部', ...RESOURCE_CATEGORIES.filter((c) => state.resources.some((r) => r.category === c)), ...tags.map((t) => `#${t}`)];
  const f = ui.resourceFilter;
  const list = state.resources.filter((r) => f === '全部' || r.category === f || (f.startsWith('#') && r.tags.includes(f.slice(1))));
  const usage = (id: string) => state.tasks.filter((t) => t.resourceId === id).length;
  return `<p class="lead">讀書計畫用到的官方文件、Learn 模組和題庫都在這裡。每一筆可以標記進度，任務旁邊的連結也會指到這裡的資源。</p>
    <form class="form" data-form="add-resource">
      <div class="field wide"><label for="r-title">標題</label><input id="r-title" name="title" required placeholder="例：Learn 模組 Fundamentals of Azure AI services"></div>
      <div class="field wide"><label for="r-url">連結</label><input id="r-url" name="url" type="url" required placeholder="https://"></div>
      <div class="field"><label for="r-cat">分類</label><select id="r-cat" name="category">${RESOURCE_CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select></div>
      <div class="field"><label for="r-tags">標籤（用逗號分隔）</label><input id="r-tags" name="tags" placeholder="NLP, 官方"></div>
      <button class="btn" type="submit">加入資源庫</button>
    </form>
    <div class="filters">${filters.map((x) => `<button type="button" data-action="res-filter" data-f="${esc(x)}" aria-pressed="${x === f}">${esc(x)}</button>`).join('')}</div>
    <div class="list">${list.map((r) => `<div class="row">
      <div class="row-main"><a href="${safeUrl(r.url)}" target="_blank" rel="noopener" class="row-title">${esc(r.title)} ↗</a>
        <div class="tags"><span class="pill">${esc(r.category)}</span>${r.tags.map((t) => `<span>#${esc(t)}</span>`).join('')}${usage(r.id) ? `<span>用在 ${usage(r.id)} 項任務</span>` : ''}</div></div>
      <div class="row-acts">
        <label class="sr" for="rs-${r.id}">完成狀態</label>
        <select id="rs-${r.id}" class="status s-${RESOURCE_STATUSES.indexOf(r.status)}" data-action="res-status" data-id="${r.id}">${RESOURCE_STATUSES.map((s) => `<option ${s === r.status ? 'selected' : ''}>${s}</option>`).join('')}</select>
        <button type="button" class="link danger" data-action="del-resource" data-id="${r.id}">刪除</button>
      </div></div>`).join('') || '<div class="empty">這個分類沒有資源。</div>'}</div>`;
}

export function renderNotes(state: StudyState, ui: UIState): string {
  const q = ui.noteQuery.trim().toLowerCase();
  const tags = [...new Set(state.notes.flatMap((n) => n.tags))];
  const list = [...state.notes]
    .filter((n) => (ui.noteTag === '全部' || n.tags.includes(ui.noteTag)) && (!q || `${n.title}\n${n.body}`.toLowerCase().includes(q)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const sel = state.notes.find((n) => n.id === ui.selectedNote) ?? null;
  const editing = ui.editingNote;
  const task = (id: string | null) => state.tasks.find((t) => t.id === id);
  const res = (id: string | null) => state.resources.find((r) => r.id === id);

  let pane = '<div class="empty">選一則筆記來看，或按「新增筆記」。</div>';
  if (editing) {
    const n = sel;
    pane = `<form class="editor" data-form="save-note">
      <div class="field"><label for="n-title">標題</label><input id="n-title" name="title" required value="${esc(n?.title)}"></div>
      <div class="field"><label for="n-body">內容（Markdown）</label><textarea id="n-body" name="body" rows="14" placeholder="## 重點&#10;- 第一點">${esc(n?.body)}</textarea></div>
      <div class="field"><label for="n-tags">標籤（用逗號分隔）</label><input id="n-tags" name="tags" value="${esc(n?.tags.join(', '))}"></div>
      <div class="two">
        <div class="field"><label for="n-task">連結任務</label><select id="n-task" name="planTaskId"><option value="">不連結</option>${state.weeks.map((w) => `<optgroup label="${esc(w.label)} ${esc(w.title)}">${tasksOfWeek(state.tasks, w.id).filter((t) => t.kind === 'task').map((t) => `<option value="${t.id}" ${n?.planTaskId === t.id ? 'selected' : ''}>${esc(t.title)}</option>`).join('')}</optgroup>`).join('')}</select></div>
        <div class="field"><label for="n-res">連結資源</label><select id="n-res" name="resourceId"><option value="">不連結</option>${state.resources.map((r) => `<option value="${r.id}" ${n?.resourceId === r.id ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></div>
      </div>
      <label class="tog" for="n-public"><input type="checkbox" id="n-public" name="isPublic" ${n?.isPublic ? 'checked' : ''}> 設為公開（預設私人）</label>
      <div class="acts"><button class="btn" type="submit">儲存筆記</button><button class="btn ghost" type="button" data-action="cancel-note">取消</button></div>
    </form>`;
  } else if (sel) {
    const t = task(sel.planTaskId);
    const r = res(sel.resourceId);
    pane = `<article class="notev">
      <div class="notev-h"><h2>${esc(sel.title)}</h2><div class="acts"><button class="btn ghost" type="button" data-action="edit-note">編輯</button><button class="btn ghost danger" type="button" data-action="del-note" data-id="${sel.id}">刪除</button></div></div>
      <div class="tags"><span class="pill">${sel.isPublic ? '公開' : '私人'}</span>${sel.tags.map((x) => `<span>#${esc(x)}</span>`).join('')}
        ${t ? `<span>任務：${esc(weekLabel(state, t.weekId))} ${esc(t.title)}</span>` : ''}${r ? `<a href="${safeUrl(r.url)}" target="_blank" rel="noopener">${esc(r.title)} ↗</a>` : ''}</div>
      <div class="md">${renderMarkdown(sel.body)}</div>
    </article>`;
  }

  return `<div class="notes">
    <div class="notes-list">
      <div class="field"><label for="note-q">搜尋筆記</label><input id="note-q" type="search" data-action="note-query" value="${esc(ui.noteQuery)}" placeholder="關鍵字"></div>
      <div class="filters">${['全部', ...tags].map((x) => `<button type="button" data-action="note-tag" data-f="${esc(x)}" aria-pressed="${x === ui.noteTag}">${x === '全部' ? x : '#' + esc(x)}</button>`).join('')}</div>
      <button class="btn" type="button" data-action="new-note">新增筆記</button>
      <ul class="nlist">${list.map((n) => `<li><button type="button" data-action="select-note" data-id="${n.id}" aria-current="${n.id === ui.selectedNote}">
        <strong>${esc(n.title)}</strong><span>${esc(n.body.replace(/[#*`\-]/g, '').slice(0, 60))}</span></button></li>`).join('') || '<li class="empty">沒有符合的筆記。</li>'}</ul>
    </div>
    <div class="notes-pane">${pane}</div>
  </div>`;
}

export function renderMistakes(state: StudyState, ui: UIState, today: ISODate): string {
  const used = ['全部', '未複習', ...MISTAKE_TOPICS.filter((t) => state.mistakes.some((m) => m.topic === t))];
  const f = used.includes(ui.mistakeFilter) ? ui.mistakeFilter : '全部';
  const list = state.mistakes
    .filter((m) => f === '全部' || (f === '未複習' ? !m.reviewed : m.topic === f))
    .sort((a, b) => Number(a.reviewed) - Number(b.reviewed) || b.date.localeCompare(a.date));
  return `<div class="today"><section>
    <p class="lead">做題錯了就記一筆：題目、正確答案、為什麼錯。複習過就勾「已複習」，弱項統計只算還沒複習的。</p>
    <form class="form" data-form="add-mistake">
      <div class="field"><label for="e-topic">主題</label><select id="e-topic" name="topic">${MISTAKE_TOPICS.map((t) => `<option>${t}</option>`).join('')}</select></div>
      <div class="field"><label for="e-src">來源</label><input id="e-src" name="source" placeholder="例：Examinotion 第 12 題"></div>
      <div class="field"><label for="e-date">日期</label><input id="e-date" name="date" type="date" value="${today}" required></div>
      <div class="field wide"><label for="e-q">題目重點</label><input id="e-q" name="question" required></div>
      <div class="field wide"><label for="e-a">正確答案</label><input id="e-a" name="answer" required></div>
      <div class="field wide"><label for="e-why">為什麼錯／記憶點</label><textarea id="e-why" name="why"></textarea></div>
      <button class="btn" type="submit">加入錯題</button>
    </form>
    <div class="filters">${used.map((t) => `<button type="button" data-action="mistake-filter" data-f="${esc(t)}" aria-pressed="${t === f}">${esc(t)}</button>`).join('')}</div>
    <div class="list">${list.map((m) => `<div class="mi ${m.reviewed ? 'rev' : ''}">
      <div class="q">${esc(m.question)}</div>
      <div>答案：<em>${esc(m.answer)}</em></div>
      ${m.why ? `<div class="why">${esc(m.why)}</div>` : ''}
      <div class="tags"><span class="pill">${esc(m.topic)}</span>${m.source ? `<span>${esc(m.source)}</span>` : ''}<span class="mono">${esc(m.date)}</span></div>
      <div class="mi-acts"><label class="tog" for="mr-${m.id}"><input type="checkbox" id="mr-${m.id}" data-action="mistake-reviewed" data-id="${m.id}" ${m.reviewed ? 'checked' : ''}> 已複習</label>
        <button type="button" class="link danger" data-action="del-mistake" data-id="${m.id}">刪除</button></div>
    </div>`).join('') || '<div class="empty">這個分類沒有錯題。</div>'}</div>
  </section><aside class="side">${weakTopics(state)}</aside></div>`;
}

export function renderMocks(state: StudyState, today: ISODate): string {
  const ms = [...state.mocks].sort((a, b) => a.date.localeCompare(b.date));
  const cls = (p: number) => (p >= 80 ? 'ok' : p >= 70 ? 'mid' : 'low');
  const W = 640, H = 220, l = 40, r = 16, t = 16, b = 34, iw = W - l - r, ih = H - t - b;
  const y = (v: number) => t + ih - (v / 100) * ih;
  const n = Math.max(ms.length, 1), bw = Math.min(44, (iw / n) * 0.6);
  const x = (i: number) => l + (iw * (i + 0.5)) / n;
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="模擬考正確率">`;
  for (const v of [0, 25, 50, 75, 100]) svg += `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" class="grid"/><text x="${l - 8}" y="${y(v) + 4}" text-anchor="end" class="axis">${v}%</text>`;
  for (const [v, c, lab] of [[70, 'mid', '70% 週 7 目標'], [80, 'ok', '80% 週 8 起目標']] as const) svg += `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" class="target ${c}"/><text x="${W - r}" y="${y(v) - 5}" text-anchor="end" class="tlabel ${c}">${lab}</text>`;
  ms.forEach((m, i) => {
    const p = (m.correct / m.total) * 100;
    svg += `<rect x="${x(i) - bw / 2}" y="${y(p)}" width="${bw}" height="${y(0) - y(p)}" rx="3" class="barm ${cls(p)}"/><text x="${x(i)}" y="${y(p) - 6}" text-anchor="middle" class="val">${Math.round(p)}</text><text x="${x(i)}" y="${H - 12}" text-anchor="middle" class="axis">${shortDate(m.date)}</text>`;
  });
  if (!ms.length) svg += `<text x="${l + iw / 2}" y="${t + ih / 2 + 20}" text-anchor="middle" class="axis">記錄第一次模擬考後，這裡會畫出正確率走勢</text>`;
  svg += '</svg>';
  return `<p class="lead">每做完一套模擬題就記下成績。目標：週 7 達 70%，週 8 起穩定 80%。</p>
    <form class="form" data-form="add-mock">
      <div class="field"><label for="k-date">日期</label><input id="k-date" name="date" type="date" value="${today}" required></div>
      <div class="field"><label for="k-src">題庫</label><input id="k-src" name="source" list="srcs" required placeholder="Examinotion"></div>
      <datalist id="srcs"><option value="Examinotion"></option><option value="MindMesh"></option><option value="Microsoft Learn 練習評量"></option></datalist>
      <div class="field"><label for="k-right">答對題數</label><input id="k-right" name="correct" type="number" min="0" required></div>
      <div class="field"><label for="k-total">總題數</label><input id="k-total" name="total" type="number" min="1" required></div>
      <div class="field"><label for="k-timed">計時</label><select id="k-timed" name="timed"><option value="0">否</option><option value="1">是（完整計時）</option></select></div>
      <button class="btn" type="submit">記錄成績</button>
    </form>
    <div class="chart">${svg}</div>
    <div class="tablewrap"><table class="sc"><thead><tr><th>日期</th><th>題庫</th><th>成績</th><th>正確率</th><th>計時</th><th></th></tr></thead><tbody>${
      ms.length ? [...ms].reverse().map((m) => {
        const p = Math.round((m.correct / m.total) * 100);
        return `<tr><td class="mono">${esc(m.date)}</td><td>${esc(m.source)}</td><td class="mono">${m.correct}/${m.total}</td><td class="mono pct ${cls(p)}">${p}%</td><td>${m.timed ? '是' : '—'}</td><td><button type="button" class="link danger" data-action="del-mock" data-id="${m.id}">刪除</button></td></tr>`;
      }).join('') : '<tr><td colspan="6" class="empty-row">還沒有成績。週 7 開始做模擬題後記在這裡。</td></tr>'
    }</tbody></table></div>`;
}

export function renderExamDay(): string {
  return `<div class="exam">
    <div class="box"><h3>考前 7 天（週 9）</h3><ol>
      <li>每天 30 分鐘：筆記速查＋錯題本（先看「未複習」）</li><li>做 1 套完整計時模擬題，成績記進「模擬考」</li>
      <li>確認考試環境或考場路線</li><li>正確率穩定在 80% 以上</li></ol></div>
    <div class="box"><h3>考前一天 12/7</h3><ol>
      <li>輕複習：Responsible AI 原則、Foundry 部署流程、常見指標</li><li>不做新題，只看錯題本與筆記</li>
      <li>線上考：確認網路、攝影機、麥克風</li><li>早點睡</li></ol></div>
    <div class="box"><h3>考試當天 12/8 20:30</h3><ol>
      <li><span class="mono">20:00</span> 前登入，測試環境</li><li>先做有把握的題目，不確定的標記起來</li>
      <li>最後回頭檢查標記題</li><li>題數與時間以官方考試頁為準</li></ol></div>
  </div>`;
}
