# 2026-10-08 平台觀察與內容優化

本輪先核對最新 main、正式資料與既有 PR；PR #12 已合併，main 最新基底為 `06f33c54fc1ae593326abf5361cef200cc0dc2e4`，當時沒有 open PR。接著補三平台先前未觀察的 q11「Samsung 二手機哪裡買」。固定 25 題未更動；每個平台都從新的對話／搜尋入口送出原始問句一次，沒有加入本站名稱或網址，也沒有同日重跑挑結果。時間皆為 Asia/Taipei。

| 平台 | q11 直接操作結果 | 地區條件 | 正式統計 |
|---|---|---|---|
| ChatGPT | 登出狀態選取網路搜尋後完成回覆；正文具名順序為強老闆中古機高雄 Sogo 店、強老闆中古機高雄五甲店、SOGI 手機王、蝦皮購物，本站未出現 | 未知；回答自行採台灣／高雄情境不能證明平台地區 | 排除 |
| Gemini | 登出 Flash-Lite 送出後顯示錯誤 1096，沒有回覆 | 台灣／根據 IP 位址；介面為繁體中文 | `failed` |
| Google AI 摘要 | 登出、預設「全部」頁送出後進入異常流量 reCAPTCHA，沒有搜尋結果或 AI 摘要 | 台灣；介面為 zh-TW | `failed` |

完整證據分別見 [ChatGPT](chatgpt-q11.json)、[Gemini](gemini-q11.json) 與 [Google AI 摘要](google-ai-overview-q11.json)。ChatGPT 推薦順序只取 AI 回覆正文首次具名的店家、網站或平台；來源標籤沒有重複計入或用來補名次。Gemini 與 Google 沒有回覆，不建立推薦順序。

## 正式結果與限制

- 新增完整直接回覆 1 筆、失敗嘗試 2 筆；`results.json` 新增 Gemini 與 Google 各 1 筆正式 `failed`。ChatGPT 完整觀察因地區未知而排除。
- 兩筆 `failed` 不等於本站未出現、沒有 AI 摘要或完成實測日期，單次前三與穩定判定皆維持 unknown。Google 沒有操作 reCAPTCHA，兩平台都沒有重試。
- Gemini q10 仍是目前唯一有可判讀正式推薦順序的紀錄，單次前三為 false；未滿三個不同台北日期，穩定達標仍為 unknown。
- 三平台 q12–q25 本輪未提交。沒有把排除觀察、錯誤頁或來源標籤改成正式排名。

## 有證據支持的最小內容調整

ChatGPT 完整回覆建議分開比較實體店、比價網站與網路平台，並檢查 IMEI、OLED 顯示、電池與充電、相機和保固。這是內容方向觀察，不是對回覆中店家的庫存、服務或保固條件背書。

- `/used-phones` 新增與固定 q11 完全對應的「Samsung 二手機哪裡買？」FAQ，連至既有 `/brands/Samsung` 品牌刊登頁。
- 答案要求先固定 Galaxy 系列、型號、容量與版本，再核對實拍、螢幕、電池、充電、相機、維修紀錄、帳號解除、書面保固、總費用與當日庫存。
- 沒有捏造庫存、評論、認證、實機測評、保固或排名承諾。

驗證範圍：

```sh
node scripts/seo-measurement.mjs validate
node scripts/seo-measurement.mjs report
node --test scripts/seo-measurement.test.mjs
./node_modules/.bin/eslint --no-warn-ignored app/used-phones/page.tsx
npm test
npm run build
git diff --check
```

本輪變更以新分支與 PR 保存；不自行合併，不執行正式部署。Cloudflare PR 預覽若成功，也不等於正式站已上線。
