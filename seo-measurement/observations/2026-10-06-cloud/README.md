# 2026-10-06 平台觀察與內容優化

本輪先核對最新 main、正式資料與既有 PR；PR #8 已合併，main 最新基底為 `095a16ba023e1231e3b2b49b9379731c98327198`。接著從 main 建立新分支，補三平台先前未觀察的 q09「二手 iPhone 哪裡買」。固定 25 題未更動；每個平台都從新的對話／搜尋入口送出原始問句一次，沒有加入本站名稱或網址，也沒有同日重跑挑結果。時間皆為 Asia/Taipei。

| 平台 | q09 直接操作結果 | 地區條件 | 正式統計 |
|---|---|---|---|
| ChatGPT | 選取網路搜尋後完成回覆；正文具名順序為高雄青蘋果3C競標、蝦皮、ePrice，本站未出現 | 未知；回答自行採台灣／高雄情境不能證明平台地區 | 排除 |
| Gemini | Flash-Lite 完成回覆；正文先列 US3C、Q哥、K3數位、青蘋果3C，本站未出現 | 英國 IP；介面為繁體中文 | 排除 |
| Google AI 摘要 | 預設「全部」頁完整顯示 AI 摘要；正文先列 Miko 3C、創宇、PChome，本站未出現 | 英國／大倫敦 IP；介面為 zh-TW | 排除 |

完整證據分別見 [ChatGPT](chatgpt-q09.json)、[Gemini](gemini-q09.json) 與 [Google AI 摘要](google-ai-overview-q09.json)。推薦順序只取 AI 回覆正文中可判讀的具名店家或平台；ChatGPT 的 SOGI 僅為來源標籤，Google 的贊助產品、一般搜尋結果與來源卡片，以及各平台引用標籤順序均未計入排名。

## 正式結果與限制

- 新增完整直接回覆 3 筆，正式 `results.json` 新增 **0 筆**。各平台 q10–q25 本輪未提交，沒有宣稱完成 75 題。
- 三平台正式報表仍為 25 題未測，單次前三未知、穩定總組數未知；已確認穩定組數下限為 0，不代表零曝光。
- ChatGPT 地區無法核對；Gemini 與 Google 明示英國 IP。沒有修改網路、位置或帳號條件，也沒有以一般搜尋工具替代實際平台回覆。

## 有證據支持的最小內容調整

三個完整回覆都把購買管道分為專業店家、網路平台與個人交易，並提到電池、啟用鎖定與售後條件；其中 ChatGPT 與 Google AI 摘要另提醒查看零件／維修紀錄。這是本輪排除正式排名的內容觀察，不是對個別競品服務的事實查核。

- `/used-phones` 新增「二手 iPhone 哪裡買？」FAQ，連至既有 `/brands/Apple`，要求逐支確認實機、啟用鎖定、電池、零件／維修紀錄、書面保固與總費用。
- 沒有新增或捏造店家、商品、庫存、評論、認證、測評、保固或排名承諾。

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

## 建立 PR 當下的狀態（歷史紀錄）

本輪由已包含 PR #8 的最新 main 建立新分支與 PR；新 PR 保持 open，不自行合併、不執行正式部署。Cloudflare PR 分支預覽若成功，也不等於正式站上線。

## 合併後狀態補記（2026-10-06）

以上「新 PR 保持 open、不自行合併、不執行正式部署」保留為建立 PR 當下的歷史描述；後續 repository 狀態如下，不再代表 PR #10 的目前狀態。

- [PR #10](https://github.com/eday06011984/second-phone-king/pull/10) 已於 **2026-10-06 02:37:31 UTC（Asia/Taipei 10:37:31）** 合併至 main。
- 對應 main merge commit：[ `93167555ce9e0a75e61045f0fd90b424c4f0d018` ](https://github.com/eday06011984/second-phone-king/commit/93167555ce9e0a75e61045f0fd90b424c4f0d018)。
- 該 merge commit 的 [`Workers Builds: second-phone-king` check](https://github.com/eday06011984/second-phone-king/runs/112080984909) 為 `completed / success`，完成時間為 **2026-10-06 02:39:08 UTC（Asia/Taipei 10:39:08）**。
- Cloudflare Build ID：[`9d000614-97e6-4e50-8a51-60c88bf7066b`](https://dash.cloudflare.com/ac5870e70dd69e60e6adad39dfe3b8c9/workers/services/view/second-phone-king/production/builds/9d000614-97e6-4e50-8a51-60c88bf7066b)。
- Cloudflare Version ID：`e948d85d-9f74-425a-a67e-14bc45a5b4d8`。

本補記核對範圍為 GitHub PR 狀態與該 main merge commit 的 Cloudflare check。**Workers build success 不等於已驗證正式網域內容**；本次未直接核對正式網域頁面是否呈現該版本，不據此宣稱正式站內容驗收完成。

q09 三平台的原始觀察與排除理由維持不變：ChatGPT 地區未知，Gemini 與 Google 為英國 IP，三筆仍排除正式台灣統計。PR 合併與建置成功不構成排名證據；本補記不新增正式排名、不改動 `results.json` 或固定 25 題，亦不回寫歷史測量結果。
