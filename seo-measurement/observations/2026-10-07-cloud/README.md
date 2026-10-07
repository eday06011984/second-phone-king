# 2026-10-07 平台觀察與內容優化

本輪先核對最新 main、正式資料與既有 PR；PR #11 已合併，main 最新基底為 `a118868682e00c46ff0930c9659e835326d40432`，當時沒有 open PR。接著補三平台先前未觀察的 q10「二手 iPhone 價格怎麼比較」。固定 25 題未更動；每個平台都從新的對話／搜尋入口送出原始問句一次，沒有加入本站名稱或網址，也沒有同日重跑挑結果。時間皆為 Asia/Taipei。

| 平台 | q10 直接操作結果 | 地區條件 | 正式統計 |
|---|---|---|---|
| ChatGPT | 登出狀態選取網路搜尋後完成回覆；正文具名順序為 ePrice、SOGI，本站未出現 | 未知；回答提到台灣行情不能證明平台地區 | 排除 |
| Gemini | 登出 Flash-Lite 完成回覆；正文前三為 SOGI 手機王、miko 米可、保衛站，本站未出現 | 台灣／根據 IP 位址；介面為繁體中文 | `not_present` |
| Google AI 摘要 | 登出、預設「全部」頁完整顯示 AI 摘要；正文順序為傑昇通信、地標網通，本站未出現 | 英國；精確位置不明；介面為 zh-TW | 排除 |

完整證據分別見 [ChatGPT](chatgpt-q10.json)、[Gemini](gemini-q10.json) 與 [Google AI 摘要](google-ai-overview-q10.json)。推薦順序只取 AI 回覆正文中可判讀的具名網站、店家或平台；引用按鈕、來源標籤、一般搜尋結果與影片沒有計入排名。

## 正式結果與限制

- 新增完整直接回覆 3 筆，`results.json` 新增 **1 筆** Gemini `not_present`；ChatGPT 與 Google 的完整觀察仍保留但排除。
- Gemini q10 單次前三為 false。由於同問句同平台尚未累積三個不同台北日期，穩定達標仍為 unknown；這不是排名保證，也不能外推到其他問句或平台。
- ChatGPT 與 Google 的 q10 正式狀態仍是未測；三平台 q11–q25 本輪未提交。沒有把排除觀察或引用來源改成正式結果。

## 有證據支持的最小內容調整

三個直接回覆都要求固定型號／容量後，再比較機況、電池、維修、配件或保固；Gemini 與 Google 也明確區分回收／舊換新參考與購買通路。這些是內容方向觀察，不是對回覆中店家條件或價格的事實背書。

- `/used-phones` 新增與固定 q10 完全對應的「二手 iPhone 價格怎麼比較？」FAQ，連至既有價格比較指南。
- 答案明確區分店家售價、個人賣價、回收／舊換新價，並要求把已確認的必要支出計入總成本；沒有新增即時行情或店家服務宣稱。
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
