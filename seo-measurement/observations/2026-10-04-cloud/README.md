# 2026-10-04 平台觀察與內容優化

本輪先核對 main、正式資料與既有 PR #5，再補三平台先前未觀察的 q06「二手機店家」。固定 25 題未更動；每個平台都從新的對話／搜尋入口送出原始問句，沒有加入本站名稱或網址，也沒有為了挑最好結果重跑。時間皆為 Asia/Taipei。

| 平台 | q06 直接操作結果 | 地區條件 | 正式統計 |
|---|---|---|---|
| ChatGPT | 選取網路搜尋後完成回覆；以芝加哥附近為情境，店家依序為 2A Electronics、Chicago Gadgets、SwiftTechBuy，本站未出現 | 未知；回答自行推定芝加哥不能代替地區設定證據 | 排除 |
| Gemini | Flash-Lite 完成台灣店家回覆；清單項目依序為創宇、洋蔥、傑昇／地標，本站未出現 | 英國／根據 IP 位址 | 排除 |
| Google AI 摘要 | 成功展開完整摘要；「推薦二手機店家與特色」依序為創宇、Q哥、BIG2，本站未出現 | 英國／大倫敦－根據你的 IP 位址；介面為 zh-TW | 排除 |

完整證據分別見 [ChatGPT](chatgpt-q06.json)、[Gemini](gemini-q06.json) 與 [Google AI 摘要](google-ai-overview-q06.json)。排名只使用各平台回覆正文中可判讀的店家清單；引用標籤、來源卡片、地圖重複卡片及 Google 一般網頁搜尋結果均未計入名次。Gemini 第三項把傑昇與地標寫在同一項，因此原樣保留為一個含兩個店名的模糊位置，不拆成虛構名次。

## 正式結果與限制

- 新增完整直接回覆 3 筆，正式 `results.json` 新增 **0 筆**。各平台 q08–q25 本輪未提交，沒有宣稱完成 75 題。
- 三平台正式報表仍為 25 題未測，單次前三未知、穩定總組數未知；已確認穩定組數下限為 0，不代表零曝光。
- ChatGPT 回答情境與正式台灣條件不符且平台地區無法核對；Gemini 與 Google 明示英國 IP。沒有修改網路、位置或帳號條件，也沒有用一般搜尋工具替代平台回覆。

## 有證據支持的最小內容調整

三個直接平台回覆都把 q06 解讀為依地區尋找實體二手機店家，並反覆提到可聯絡門市、現場檢查及售後條件。這是本輪不納入正式排名的內容觀察，不是對任何競品服務或保固的查核。`/stores` 因此只調整標題、摘要、主標與清單標題，直接說明如何依地區找二手機店家，以及到店前確認實機、現場驗機與書面售後條件。沒有新增或捏造店家、庫存、評論、認證、測評、保固或排名承諾。

驗證範圍：

```sh
node scripts/seo-measurement.mjs validate
node scripts/seo-measurement.mjs report
node --test scripts/seo-measurement.test.mjs
./node_modules/.bin/eslint --no-warn-ignored app/stores/page.tsx
npm run build
git diff --check
```

本輪仍只更新既有 PR #5，不建立重複 PR、不合併、不部署。Cloudflare 對 PR 分支的建置結果也不等於正式站上線。
