# Google AI 摘要人工採證作業

## 本次核對（2026-10-29，PR #30 head fe7e520）

- q06「二手機店家」：2026-10-28 08:58:39 +08:00；q07「中古手機哪裡買」：2026-10-29 08:22:27 +08:00。
- 兩份 observations 與 results.json 一致：送出前首頁頁尾明示台灣，送出一次後出現異常流量頁；均為 failed，品牌／連結／名次未知，推薦陣列空，不算完成日期。
- 原始記錄保存在 observations/2026-10-28-cloud/google-ai-overview-q06.json 及 observations/2026-10-29-cloud/google-ai-overview-q07.json。這些是當時保存的文字證據；本次沒有回到過去重驗畫面，也沒有補造截圖。
- 正式 99 筆中 Google 有 16 筆 failed；三平台各 25 題穩定判定仍未知。本次只改善程序與回歸測試，不新增實測結果。

## 下一次實測：人操作正常瀏覽器

由人在台灣實際使用自己的 iPhone Safari／Chrome 或電腦瀏覽器操作，不再由雲端代理重複送查詢探測能否解除阻擋。無痕不是台灣地區證明，也不保證避開異常流量。不要輪換 IP／VPN／代理、變更裝置指紋、使用解 CAPTCHA 服務、重載或換入口躲避限制。

1. 預先選定原問句 q06 或 q07、操作裝置及正常網路，建立一個全新搜尋工作階段（無既有查詢或對話），不沿用有本站搜尋歷史的頁面。記錄瀏覽器、登入／登出、個人化與新工作階段的實際狀態；不能將「新分頁」直接稱為乾淨瀏覽器。
2. 開啟 Google 首頁，檢查語言為繁體中文。地區設定可由正常 Google 搜尋設定選台灣，**但設定值、google.com.tw、hl/gl 參數及回覆提到高雄均不足以單獨證明此次地區**。保存首頁頁尾國家及位置來源；結果成功後再保存結果頁頁尾所使用的位置及來源（IP／裝置位置／活動記錄）。若顯示外國、互相矛盾或無法核對，僅存 observations，不填正式 context.region=TW。需要更新位置時，只用 Google 正常位置功能並由本人自行決定是否授權；不模擬定位。
3. 從固定題表逐字輸入一次，不加台灣、本站名、網址或「請產生 AI 摘要」。使用一般 Google 搜尋的「全部」分頁；記錄實際分頁、登入狀態及是否顯示 AI 摘要。不要切換「AI 模式」或 Gemini 代替本指標。
4. 等頁面正常完成。若出現 AI 摘要，使用該區塊的展開按鈕展開全文，保存所有正文及來源連結；不點「深入探索 AI 模式」作替代、不追問、不重送挑較佳版本。若顯示驗證／異常流量，立即保存錯誤並結束本次採證。人日後可依 Google 官方流程自行完成驗證或聯絡網管；工具不代答、不繞過，本次失敗仍保留。
5. 同一採證包保存：送出前頁尾、查詢文字及「全部」分頁、AI 摘要標題、展開全文、來源區與結果頁頁尾。長文用有重疊的連續截圖（01、02…）及逐字 response.txt；保留段落與順序。iPhone 可用連續螢幕錄影輔助呈現展開及捲動，但仍提供可讀全文／截圖。PDF 或整頁截圖須逐頁確認沒有漏掉動態摘要。
6. 記錄 submitted_at、captured_at（含 +08:00），measured_at 使用完成擷取時間；錯誤則使用錯誤頁擷取時間。另記 Google 顯示的時間（若有）並註明來源，不以提交程式或 commit 時間替代。記錄實際搜尋網址；公開副本移除帳號、精確位置、IP 與追蹤 token，保留 origin/path、查詢及模式，說明刪除範圍，不能遮掉國家／位置來源、時間或摘要。
7. 採證資料夾使用 observations/<實際台北日期>-manual/<question-id>-<時間>/，含 capture.md、response.txt（有全文時）、連續截圖或錯誤截圖。capture.md 記每個檔名、上述環境／時間／地區證據、完整性、去重依據、是否正式納入及排除原因。原始檔不覆寫；後續更正另寫補記。若需遮蔽，原件留在受控位置，repo 只放可審閱副本；不得提交帳號憑證。

## 三種結果及正式欄位

| 採證結果 | status | evidence | brand_mentioned / site_link | recommended_sites | 計算 |
|---|---|---|---|---|---|
| 完整 AI 摘要有可判讀網站推薦順序且包含本站 | ranked | full_response 全文或 screenshot 完整截圖入口 | 如實填 boolean／本站連結或 null | 全部網站依首次推薦順序去重，本站 ID 為 second-phone-king | 由陣列推導名次 |
| 完整 AI 摘要有推薦清單但沒有本站 | not_present | 同上 | 如實填；提及／引用不等於推薦 | 完整非空清單，不含本站 | 明確非前三 |
| 正常結果頁確無 AI 摘要，或完整摘要沒有可判讀推薦順序 | indeterminate | 無摘要用 screenshot；有全文用 full_response 或 screenshot | 只就 AI 區塊判斷；無摘要填 false / null，notes 說明非排名結論 | [] | 前三未知 |
| 阻擋／網路或生成錯誤，未取得完整回覆 | failed | error，逐字錯誤與截圖路徑寫入 notes | null / null | [] | 未完成日期、前三未知 |

截圖遺失／只截一半、地區未知或模式不是 AI 摘要：先留 observations，不能用 indeterminate 使不合格資料進入正式統計。生成中斷則留 failed；已取得的片段只存原始觀察，不拿來排名字。一般搜尋、地圖、廣告、來源卡排序不能補成摘要推薦名次。沒有摘要時即使一般搜尋有本站，也不能填本站連結或品牌提及。程式只驗證結構，不能辨識圖片真假、全文完整性或模式，人工審查不可省略。

## 可直接套用 schema v1 的採證起始 JSON

下例是 **待填範本，不是實測資料，不可原樣追加 results.json**。保留 null 以避免預填未確認的事實。q07 改 question_id 及 prompt 為「中古手機哪裡買」；其他固定題從 questions 逐字取用。

```json
{
  "id": "REPLACE_WITH_UNIQUE_CAPTURE_ID",
  "question_id": "q06",
  "platform": "google_ai_overview",
  "prompt": "二手機店家",
  "status": null,
  "measured_at": null,
  "mode": null,
  "source": "direct_platform",
  "context": {"language": null, "region": null, "fresh_session": null, "unprompted_target": null},
  "evidence": null,
  "brand_mentioned": null,
  "site_link": null,
  "recommended_sites": [],
  "notes": ""
}
```

完成採證後，填 status、真實含時區時間及 mode，例如實際符合才填 `Google Search / All / AI Overview expanded / logged out / iPhone Safari`。context 四個值必須分別有證據支持才填 zh-TW、TW、true、true；其他情況留 observations，不送正式驗證。

- 成功：evidence 填 `{"kind":"full_response","value":"實際逐字全文"}`，或 `{"kind":"screenshot","value":"實際完整截圖路徑或可存取 URL"}`。多張截圖在 value 列完整檔名，notes 指向 capture.md；填真實推薦清單及提及／連結。
- 失敗：status=failed；evidence 填 `{"kind":"error","value":"實際錯誤原文"}`；品牌與連結 null，網站 []；notes 寫阻擋、原始證據路徑及地區核對方式。
- 無法判定：status=indeterminate；保留完整摘要或正常結果頁截圖，網站 []；notes 明寫「未出現 AI 摘要」或「無可判讀推薦順序」，不能寫本站未出現。
- 排名物件只有 `site_id`、`name`、`is_target`；本站固定 `{"site_id":"second-phone-king","name":"二手機王","is_target":true}`，只在實際推薦時加入。沒有手填 rank 欄位。

先由第二次人工檢查比對原件（可以同一人逐項重看），再把完成 record **追加**至 results.json 的 records。保留 questions、75 筆 baseline 及全部歷史紀錄。不要將 observations 檔整份直接塞進 records，兩者欄位不同。

```sh
node scripts/seo-measurement.mjs validate
node scripts/seo-measurement.mjs report
node --test scripts/seo-measurement.test.mjs
git diff --check
```

確認 diff 只有新證據、追加的 record 與對應報表。穩定性依同平台同問句三個不同台北日期；每天最早完整有效回覆被採用，failed 不算日期，indeterminate 算回覆日期但前三未知。不得把三次失敗或 q06、q07 的日期相加當成穩定達標。下一次先完成 q06 一次人工採證，再按原固定問句安排 q07；未開始的計畫不新增 failed 或 not_present。

## 官方參考（2026-10-29 查閱）

- [AI Overviews 說明](https://support.google.com/websearch/answer/14901683)：台灣、繁體中文在支援範圍，但摘要只在系統判定適合時顯示，不保證每題出現。
- [搜尋個人化與位置](https://support.google.com/websearch/answer/12410098)：搜尋使用位置等情境，結果頁頁尾顯示所用位置；關閉個人化不等於移除位置影響。
- [異常流量官方說明](https://support.google.com/websearch/answer/86640?hl=zh-Hant)：包含共享網路自動流量等可能原因，僅憑錯誤不能斷定本次原因。依正常真人驗證或網管排障處理，不用自動排名查詢替代人工操作。
