# 二手機王新聞更新

> 2026-10-09：因收錄資料不足，市場／店家平均價格功能已停用。維護新聞、指南與 SEO 文案時，不得宣稱本站提供市場均價、統計行情或自動恢復該顯示；可引用逐筆可核對的店家刊登價格。歷史觀測證據保留原文。

Repository: eday06011984/second-phone-king
Branch: main
Production Worker: second-phone-king
Public site: https://xn--4kq449bj1fmzj.tw

## 唯一發布流程

正式網站已遷移至 Cloudflare Worker。唯一有效來源是上述 GitHub repository 的 main 分支；Cloudflare 依 main 自動建置與部署。

禁止使用或部署舊 Sites project `appgprj_6aab4c1b3ec48191acdcdc53c98dc515`，禁止恢復舊網域綁定，也不得建立替代 Sites project。每次更新前先確認 GitHub 讀寫權限並讀取 main 最新版本；沒有權限就回報受阻，不得回退舊站或宣稱刊登成功。

## 內容格式

新聞只追加至 `content/news.json`，並保留既有文章、店家、商品、登入、D1 資料、R2 圖片與網域設定。欄位如下：

- `slug`：唯一 ASCII kebab-case
- `title`
- `category`
- `description`
- `publishedAt`、`updatedAt`：含時區的實際 ISO timestamp
- `sections: [{ heading, paragraphs: [string] }]`
- `sources: [{ name, url, date }]`，其中 date 為原始來源日期 `YYYY-MM-DD`

首頁、`/news`、`/news/[slug]` 與 sitemap 由既有程式自動生成。不得改動店家與商品資料。

## 編輯原則

每次依 Asia/Taipei 當日已刊登篇數補足至最多 3 篇，重跑必須去重。優先最近 48 小時的手機新品、更新、二手機市場、購機與 3C 配件消息，不足再延至 7 天，並適度分散品牌。可靠題材不足時少發並說明，禁止倒填日期或湊篇數。

所有內容採原創繁體中文整理，查核官方原始來源與消息日期，清楚區分事實與編輯分析；不得抄寫新聞稿、編造測試、價格或規格，也不得堆砌關鍵字。來源要附可靠連結與日期，不得宣稱保證 Google 索引或排名。

## 來源蒐集與編輯的分工

- `scripts/update-news.mjs` 只蒐集未審核候選，**不寫入 `content/news.json`**。RSS 的英文標題、摘要與時間是來源素材，不是本站文章；不能把素材加上通用中文段落就當成原創繁體中文。
- 每日 GitHub Actions 仍於台北 02:15 執行；輸出至 git 忽略的 `work/news-candidates.json`，並保存為該次 Actions 執行的 `news-candidates-<run_id>` artifact，保留 7 天。這不是公開頁面，也不會自動匯入網站。來源失敗、找不到合適素材或當日額度已滿時仍輸出狀態，既有新聞不變。
- 每日維護的編輯／受託維護助手仍負責查核來源、撰寫原創繁體中文與發布。可讀取上述候選，也可依既有選題原則自行研究可靠來源；候選不足不代表必須湊篇數。RSS 排程本身沒有原創編輯能力，因此只做蒐集，不再自動發布未編輯素材。
- 候選中的 `sourcePublishedAt` 保留 feed 原始時間；`sources[].date` 是暫以台北日曆換算的候選日期，編輯必須回原文核對原始來源日期。正式文章的來源日期與本站刊登時間分開保存。

## 每次發布前的編輯清單

由實際負責編輯的維護者完成，不能由候選檔的旗標代替：

1. 開啟可靠原始來源，核對事件、消息日期、機型、地區、功能與適用條件。
2. 以原創繁體中文重寫標題、摘要和全文；區分來源已確認事實與編輯分析，保留可靠連結及原始日期。
3. 檢查主題與來源是否重複，優先 48 小時、必要時 7 天內的合適消息；可靠題材不足就少發。
4. 不抄寫 RSS／新聞稿，不編造實測、價格、規格；確認每段確實對讀者有用，不加制式文字湊篇幅。

## 發布與驗證

### 資料與發布驗收

- `npm run test:news`：零外部依賴的 Node 內建測試。包含結構、來源日期、台北跨日、昨日來源今日刊登、同日重跑、滿額、倒填日期、未編輯英文素材、失敗不寫入、以本機 bare git repository 模擬其他寫入者更新 main。
- `npm run validate:news`：唯讀檢查完整 `content/news.json`；也可執行 `node scripts/validate-news.mjs <檔案路徑>`。這是結構檢查，不會 fetch main，也不能單獨取代發布驗收。
- 必要文字欄位須為非空字串；sections、paragraphs、sources 須為非空陣列，逐項檢查物件與文字型別；slug 須為唯一 ASCII kebab-case。
- 來源 URL 須為可解析的絕對 HTTP(S) URL，不接受帳密、空白或反斜線。這不代表連結可連線或內容已查證。
- 刊登／更新時間須為含時區的有效 ISO timestamp（接受既有微秒精度），拒絕不存在日期，更新不得早於刊登，未來時間僅容許 5 分鐘時鐘誤差。
- 來源日期須為有效 `YYYY-MM-DD`，不得晚於台北當日或最後更新的台北日期；可在另行審核的歷史修訂中補較新的來源。舊文章與舊來源不套用 48 小時／7 天選題限制。
- `npm run validate:news:publication`：必須在 repository 根目錄執行，會先 fetch `origin/main` 並以該次 SHA 的內容為基準。fetch 失敗或 HEAD 不包含最新 main 時停止；完整保留歷史內容和順序，只允許追加；新文章的刊登／更新時間須一致且屬於目前台北當日，與 main 今日既有篇數合計不得超過 3。新文章也不可重複 slug、標題或來源 URL。歷史超額日期不回填、不改寫，沒有新增時可保持原狀通過。
- `Check news publication` PR workflow 執行相同發布驗收；它不寫入 main，也不部署。過了台北午夜或 main 有新進度，必須更新分支並重新驗收。
- 驗收不會用中文字數或正規表示式宣稱驗證原創性；它只能檢查資料與發布規則。來源真實性、繁體中文品質、原創性與選題時效仍由編輯負責。

### 日常維護者／手動發布路徑

1. 讀取最新 main 與本文件。用獨立草稿檔保存完成編輯的文章，格式為 `{ "kind": "reviewed-news", "articles": [...] }`；articles 內使用上方內容格式，但**省略 `publishedAt` 與 `updatedAt`**。不要直接把 feed 候選改個旗標就交給發布器。
2. 完成編輯清單後執行 `npm run publish:news -- <草稿路徑> --reviewed`。`--reviewed` 只表示呼叫者已完成清單，不是程式核實原創性的保證。發布器會重新 fetch main、確認本機新聞等同 main、檢查共同額度，並用一次擷取的實際目前時間（`+08:00`）產生新刊登／更新時間，保留草稿的 `sources[].date`。同一份已刊登且內容完全相同的草稿重跑不再新增。
3. 發布器只準備本機 `content/news.json`，不 commit、不 push、不部署。若本機已有未發布新聞、main 已前進、滿額或資料有錯會停止，不會覆寫。保存工作後先重新核對 main，再決定此次是否仍有額度與合適題材。
4. 執行必要測試、建置、內容、SEO 與 sitemap 檢查。commit 前及 push／合併前再次執行 `npm run validate:news:publication`；不要只依賴幾小時前的綠燈。若跨日，必須從保留的無時間草稿重新準備，不能倒填到昨天。
5. 只發布此次已授權的新聞相關變更至 main，讓既有 Cloudflare 自動部署。push 必須是正常非強制推送；發生 non-fast-forward 拒絕時停止，重新讀 main、核對額度並重新驗收，禁止盲目 rebase 後重推或 force-push。
6. 等待部署後，以正式網域驗證首頁、`/news`、每篇 `/news/[slug]` 與 sitemap。只有正式網域可讀且首頁、新聞列表已更新，才能回報「已發布」；若僅提交成功，必須明確標示「待部署」。

### 防護範圍與多人寫入限制

這些檢查保護上述發布器、實際執行驗收的維護流程及 PR workflow；它們不能攔截繞過流程直接改 main 的寫入，也不能證明手填的同日時間就是實際首次公開時間。fresh-main 驗收是當下快照，兩個先前已通過的 PR 仍可能在其後依序合併而超額。較強的 PR 合併保護需要 repository 管理者要求此檢查、要求分支更新或設定合併佇列；本變更沒有修改 branch protection、權限或部署設定。所有外部維護排程都應採用相同發布／驗收路徑，不可假設 workflow concurrency 能鎖住其他寫入者。

### 歷史勘誤的另行審核路徑

一般發布器與 PR 檢查刻意拒絕所有既有文章修訂，包括有正當理由的勘誤。需要勘誤時，先停止日常追加流程並提出獨立修訂 PR，列明文章 slug、錯誤證據、修改原因、完整前後差異與日期處理；原始 `publishedAt` 不應為了通過檢查而改成今天。由維護者先審核修訂，再另行審核該次專用的驗收方式與必要例外授權，補足測試後才處理發布。若已設定必要檢查，相關例外必須由有權限的管理者依既有審核程序處理。本工具沒有跳過檢查開關，不能以刪除驗收、強制推送或悄悄改 main 取代這個審核。
