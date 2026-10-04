# 2026-10-03 平台觀察與內容優化

本輪先核對 main、正式資料與既有 PR #5，再補三平台先前未觀察的 q05「二手機比價」。固定 25 題未更動；每個平台都從新的對話／搜尋入口送出原始問句，沒有加入本站名稱或網址。時間皆為 Asia/Taipei。

| 平台 | q05 直接操作結果 | 地區條件 | 正式統計 |
|---|---|---|---|
| ChatGPT | 選取網路搜尋後完成回覆；提供機型價位表，但沒有推薦網站清單。ePrice 只出現在來源標籤，未當排名 | 未知；回答寫「以台灣市場為例」不是地區設定證據 | 排除 |
| Gemini | Flash-Lite 產生部分比價管道後在句中停止，頁面顯示「你停止了這則回覆」；本輪沒有執行停止操作 | 英國／根據 IP 位址 | 排除 |
| Google AI 摘要 | 成功展開完整摘要；回答中的比價管道首次出現順序為 BigGo、飛比、ePrice、SOGI、地標、傑昇、Miko，本站未出現 | 英國－根據你的 IP 位址；介面為 zh-TW | 排除 |

完整證據分別見 [ChatGPT](chatgpt-q05.json)、[Gemini](gemini-q05.json) 與 [Google AI 摘要](google-ai-overview-q05.json)。Google 僅以展開的 AI 摘要正文首次出現順序判讀並去重；引用標籤、來源卡片及一般網頁搜尋結果均未計入名次。ChatGPT 沒有可判讀的網站推薦順序，因此保持未知，沒有用唯一來源標籤補成第一名。

## 正式結果與限制

- 新增完整直接回覆 2 筆、失敗嘗試 1 筆，正式 `results.json` 新增 **0 筆**。各平台 q06、q08–q25 本輪未提交，沒有宣稱完成 75 題。
- 三平台正式報表仍為 25 題未測，單次前三未知、穩定總組數未知；已確認穩定組數下限為 0，不代表零曝光。
- ChatGPT 平台地區無法核對；Gemini 與 Google 明示英國 IP。沒有修改網路、位置或帳號條件，也沒有用一般搜尋工具替代平台回覆。

## 有證據支持的最小內容調整

三個平台回覆都顯示「二手機比價」同時包含行情查詢及特定商品比較；完整的 Google AI 摘要並區分綜合比價、專業行情與實體通路。這是本輪不納入正式排名的內容觀察，不是對個別競品價格或服務的查核。`/guides/compare-used-phone-prices` 因此把標題與摘要改成直接回答「二手機比價」，並新增以下核對原則：先分清市場區間或實際商品、固定型號／容量／查詢日期，分開刊登價、成交價與收購價，再把機況、電池、保固及必要支出納入總成本。頁面明示行情或比價工具不能代替庫存、實機與最終售價確認，也沒有新增任何行情數字、商品、庫存、評論、認證、測評或最低價承諾。

驗證範圍：

```sh
node scripts/seo-measurement.mjs validate
node scripts/seo-measurement.mjs report
node --test scripts/seo-measurement.test.mjs
./node_modules/.bin/eslint --no-warn-ignored lib/market.ts
npm run build
git diff --check
```

正式基準 75 筆有效、統計測試 10/10、完整 Vinext build、依賴安裝及 `git diff --check` 均通過。`lib/market.ts` 單檔 lint 仍回報該檔既有第 5–7 行三個 `no-explicit-any` 錯誤；本輪只改第 8 行的指南文字，沒有藉機擴大修正資料庫型別範圍。

本輪仍只更新既有 PR #5，不建立重複 PR、不合併、不部署。Cloudflare 對 PR 分支的建置結果也不等於正式站上線。
