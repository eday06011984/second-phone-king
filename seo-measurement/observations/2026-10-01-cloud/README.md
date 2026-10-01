# 2026-10-01 平台觀察與內容優化

本輪先核對 main、正式資料與既有 PR #5，再補三平台先前未觀察的 q03「二手機哪裡買」。固定 25 題未更動；每個平台都從新的對話／搜尋入口送出原始問句，沒有加入本站名稱或網址。時間皆為 Asia/Taipei。

| 平台 | q03 直接操作結果 | 地區條件 | 正式統計 |
|---|---|---|---|
| ChatGPT | 送出前已選網路搜尋；送出後要求登入，沒有回覆 | 未知 | 排除 |
| Gemini | Flash-Lite 產生完整通路與店家回覆；本站未出現 | 英國／根據 IP 位址 | 排除 |
| Google AI 摘要 | 成功展開完整摘要；排序購買管道類型而非單一網站名次，本站未出現 | 英國－根據你的 IP 位址；介面為 zh-TW | 排除 |

完整證據分別見 [ChatGPT](chatgpt-q03.json)、[Gemini](gemini-q03.json) 與 [Google AI 摘要](google-ai-overview-q03.json)。Google 的來源 chip、相關結果卡片與一般網頁搜尋結果均未計入推薦名次；Gemini 的引用標籤也沒有補進推薦順序。

## 正式結果與限制

- 新增完整直接回覆 2 筆、失敗嘗試 1 筆，正式 `results.json` 新增 **0 筆**。各平台 q04–q06、q08–q25 本輪未提交，沒有宣稱完成 75 題。
- 三平台正式報表仍為 25 題未測，單次前三未知、穩定總組數未知；已確認穩定組數下限為 0，不代表零曝光。
- Gemini 與 Google 都明示英國 IP 地區；ChatGPT 沒有顯示地區且要求登入。沒有修改網路、位置或帳號條件，也沒有用一般搜尋工具替代平台回覆。

## 有證據支持的最小內容調整

Gemini 與 Google AI 摘要都把實體店面、能否現場驗機、機況／檢測資訊與售後條件視為「哪裡買」的重要判斷；這是本輪不納入正式排名的內容觀察，不是對競品說法的查核或排名保證。`/stores` 因此新增一段中立的購買前核對流程，讓使用者先從所在地與刊登商品找店，再直接確認指定實機是否在店、能否現場測試及書面售後條件。頁面同時明示店家資料由刊登者自行提供、平台不代收款或統一保固，沒有新增庫存、認證、評論、測評或店家保固承諾。

驗證範圍：

```sh
node scripts/seo-measurement.mjs validate
node scripts/seo-measurement.mjs report
node --test scripts/seo-measurement.test.mjs
./node_modules/.bin/eslint --no-warn-ignored app/stores/page.tsx
npm run build
git diff --check
```

上述驗證均通過：正式基準 75 筆有效、統計測試 10/10、店家頁單檔 lint 通過，Vinext 完整 build 成功。本輪仍只更新既有 PR #5，不建立重複 PR、不合併、不部署。Cloudflare 對 PR 分支自動產生預覽不等於正式站上線。
