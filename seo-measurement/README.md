# AI 搜尋驗收工具使用方式

依據根目錄 `SEO_MEASUREMENT.md` 的原文 25 組問句，獨立統計 ChatGPT 搜尋、Gemini、Google AI 摘要。這是人工實測資料的驗證與彙總工具，不會呼叫平台、不會自動搜尋、不會產生或推估排名。Node.js 22.13+，無額外套件、API 金鑰或網路需求。

## 立即使用

在 repo 根目錄執行：

```sh
node scripts/seo-measurement.mjs validate
node scripts/seo-measurement.mjs report
node --test scripts/seo-measurement.test.mjs
```

- 正式資料：`seo-measurement/results.json`。已建立 25 問句 × 3 平台 = 75 筆 `not_tested` 空白基準；尚無符合條件、可納入正式統計的實測。條件不符或未知的直接觀察另見 [observations/README.md](observations/README.md)，不能假填台灣地區或全新對話以通過驗證。
- 閱讀報表：`seo-measurement/reports/report.md`。
- 完整機器可讀報表：`seo-measurement/reports/report.json`，含所有原始紀錄、推導名次、單次前三、每問句各狀態筆數及穩定判定採用的紀錄 ID。
- 每次資料更新後重跑 validate / report；輸出可重現，不加入每次執行的時間戳。
- 指定檔案：`node scripts/seo-measurement.mjs report path/to/results.json path/to/reports`。路徑相對目前工作目錄。
- 新建另一份空白基準：`node scripts/seo-measurement.mjs init path/to/new-results.json`（父目錄須存在）。`init` 拒絕覆寫既有檔案。
- 資料錯誤會顯示 record ID 與原因，exit code 1，不產生新報表；此時舊報表不可當作最新結果。

## JSON 格式（schema_version 1）

顶層欄位為 `schema_version: 1`、`timezone: "Asia/Taipei"`、`questions`、`records`。`questions` 必須與原文件的固定問句逐字一致，ID 為 q01–q25；工具會檢查，不能任意更換測題。

每筆 record 欄位：

| 欄位 | 格式及用途 |
|---|---|
| id | 唯一字串，建議平台＋問句＋時間；同 timestamp 以 id 字典序決定先後 |
| question_id / prompt | q01–q25 / 完整原始問句，必須匹配 |
| platform | `chatgpt`、`gemini`、`google_ai_overview`，不可混用 |
| status | 下表五種狀態之一 |
| measured_at | 含時區 ISO 時間，例如格式 `YYYY-MM-DDTHH:mm:ss+08:00`；未測為 null |
| mode | 實際產品、模型/模式、搜尋開關及登入情況；未測為 null |
| source | 實際操作平台填 `direct_platform`；未測為 null；不接受一般搜尋工具結果 |
| context | 實測時填 `{"language":"zh-TW","region":"TW","fresh_session":true,"unprompted_target":true}`；未測為 null；只有實際符合才可填 true |
| evidence | `{"kind":"full_response","value":"完整原始回覆"}` 或 `{"kind":"screenshot","value":"可存取且包含完整回覆的截图路徑/URL"}`；失敗用 kind `error` 記錄實際錯誤；未測 null |
| brand_mentioned | 回覆是否提及本站品牌，boolean；未測/失敗為 null；與引用連結分開 |
| site_link | 回覆中實際本站 HTTPS 連結，未引用填 null；只接受二手機王.tw 網域（含 www） |
| recommended_sites | 依完整回覆首次推薦順序、不同網站去重後的完整陣列；不可用引用來源列代替 |
| notes | 字串；無法判定或失敗時必填原因；可補充模式變動、人工去重依據 |

每個推薦網站物件含 `site_id`（穩定的網站識別字串）、`name`（網站名稱）、`is_target`（boolean）。二手機王一律使用 `site_id: "second-phone-king"` 且 `is_target: true`，其他網站 false。相同網站的不同頁面、www 與非 www 應人工合併為同一 site_id，保留首次出現順序。本站 rank 由陣列位置推導，不另手填；前三網站也自動產生。

| status | 記錄方式與判定 |
|---|---|
| not_tested | 沒有直接測試；所有觀測欄位 null，網站陣列空；單次前三未知 |
| ranked | 存在可判讀推薦順序且包含本站；需品牌提及或本站實際連結；位置 1–3 為 true，4 起 false |
| not_present | 有可判讀且非空的推薦網站清單，但本站未在清單中；單次前三 false。品牌提及/引用仍獨立記錄 |
| indeterminate | 沒有推薦清單或無可判讀順序（包括 Google 沒有 AI 摘要）；網站陣列空，單次前三未知；記下原因 |
| failed | 阻擋、網路錯誤等沒有取得回覆；保存錯誤與原因，觀測值 null；不算完成實測日期 |

沒有推薦清單時，即使沒看到本站也應填 indeterminate，不能憑引用順序填排名。沒有 AI 摘要的 Google 頁面可保存截圖作為 indeterminate 證據，一般搜尋結果不算 AI 回覆。不能把 `source` 改成 direct_platform 就把搜尋工具結果充當實測；程式只能驗證格式，無法證明證據真實性、截圖完整性或人工推薦順序正確，仍需人工核對。證據若放 repo，先移除不影響判讀的帳號等私人資訊。

## 實際測量流程

1. 選定平台與問句，在全新對話/搜尋使用繁體中文、台灣情境；逐字輸入問句，不加入本站名稱、網址或引導。
2. 保存完整回覆或完整截圖，记录實際含時區時間、模式與上下文。
3. **追加**一筆 record：可複製對應空白記錄改成新的唯一 id，再填真實觀測。保留原始 baseline、失敗、未出現及無法判定紀錄，不用新結果覆寫舊結果。
4. 人工辨識推薦網站並去重，填品牌提及與本站連結。狀態按上表選擇；沒有證據就保留未測，不填示範名次。
5. 跑 validate / report，檢查 JSON 中採用紀錄及報表，將資料與報表一起提交。

## 穩定達標演算法

- 每個平台、每個問句獨立計算；平台、問句不可混合湊日期。
- 日界以 Asia/Taipei 為準。同一天多次測量全部保留，單次前三各自列出；穩定判定只取當天**最早取得實際回覆**的紀錄（ranked / not_present / indeterminate），不挑最好名次。
- failed 保留但不當完成日期，之後同日成功取得回覆可算當日測量。not_tested 不進入時間序列。
- 超過三天以最近三個有回覆的不同日期為判定窗口，防止舊成功永久達標。模式仍逐筆保存，本版依原規則按平台彙總；模式改變需人工在 notes 說明。
- 不滿三個日期：unknown，即使兩次前三也不能先報穩定達標。
- 滿三個日期：至少兩次明確前三為 met；至少兩次明確非前三為 not_met；其餘 unknown。故兩次前三＋一次無法判定仍符合至少兩次；一次前三＋一次未出現＋一次無法判定則未知。
- `confirmed_stable_questions` 是已確認達標的下限；`stable_total` 只有全 25 問句穩定判定都已知才填數值，否則 null。報表明確標「未知」，不能把 0 個已確認誤解成整體零曝光。
- `single_top_three_records` 是已確認前三的紀錄次數，非獨立問句數；若沒有任何可判讀的排名結果（只有未測、失敗或無法判定），為 null／未知。每題 `single_top_three_count` 使用相同規則；已有可判讀結果且沒有前三才為 0。混合已知與未知時，數值只計已確認前三，不代表其他紀錄皆未達標；完整未知紀錄仍保留。
- `untested_questions` 指正式資料中完全沒有嘗試的問句數，已嘗試但失敗的情況另由 status_counts 保留。條件不符的 observations 不參與此數值。

## 安全範圍與 patch

只新增離線工具、空白結果、報表、測試與說明，並在 SEO_MEASUREMENT.md 加入入口。沒有新依賴、不修改網站程式/新聞/店家/商品/登入/部署設定，不建立自動監控排程。測試中的 SYNTHETIC TEST ONLY 資料只存在記憶體與暫存目錄，不是平台觀測。

此變更可透過 PR diff 審閱；若套用提供的 patch，在乾淨工作目錄先執行 `git apply --check ai-seo-measurement.patch`，成功後 `git apply ai-seo-measurement.patch`，再跑上述驗證命令。若已合併或檔案已存在不要重複套用。移除這批新增檔案與原文件的工具入口即可回復。
