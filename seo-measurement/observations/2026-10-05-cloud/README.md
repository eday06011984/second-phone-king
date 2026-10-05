# 2026-10-05 平台觀察與內容優化

本輪先核對最新 main、正式資料及已合併的 PR #5，再從 main 建立新分支補三平台先前未觀察的 q08「二手手機推薦平台」。固定 25 題未更動；每個平台都從新的對話／搜尋入口送出原始問句，沒有加入本站名稱或網址，也沒有為了挑最好結果重跑。時間皆為 Asia/Taipei。

| 平台 | q08 直接操作結果 | 地區條件 | 正式統計 |
|---|---|---|---|
| ChatGPT | 選取網路搜尋後完成回覆；「台灣常用平台」具名順序為旋轉、蝦皮、露天、Facebook Marketplace，本站未出現 | 未知；回答寫台灣不是地區設定證據 | 排除 |
| Gemini | Flash-Lite 完成回覆；具名推薦項目依序為 Revibe、OK Store、iReborn、Carousell、Facebook／Price.com.hk，本站未出現 | 英國 IP；回答採香港情境 | 排除 |
| Google AI 摘要 | 搜尋後立即進入異常流量 reCAPTCHA，沒有取得搜尋結果或 AI 摘要 | 搜尋前首頁顯示英國；介面為 zh-TW | 失敗並排除 |

完整證據分別見 [ChatGPT](chatgpt-q08.json)、[Gemini](gemini-q08.json) 與 [Google AI 摘要](google-ai-overview-q08.json)。排名只使用回覆正文中可判讀的具名推薦項目；引用標籤、通用平台類型、其他項目說明中的括號例子及一般搜尋結果均未計入名次。Gemini 最後把 Facebook 群組與 Price.com.hk 寫在同一項，因此原樣保留為一個含兩個名稱的模糊位置，不拆成虛構名次。

## 正式結果與限制

- 新增完整直接回覆 2 筆、失敗 1 筆，正式 `results.json` 新增 **0 筆**。各平台 q09–q25 本輪未提交，沒有宣稱完成 75 題。
- 三平台正式報表仍為 25 題未測，單次前三未知、穩定總組數未知；已確認穩定組數下限為 0，不代表零曝光。
- ChatGPT 地區無法核對；Gemini 明示英國 IP 且回答採香港情境；Google 遇到異常流量驗證。沒有修改網路、位置或帳號條件，也沒有操作 CAPTCHA 或用一般搜尋工具替代平台回覆。

## 有證據支持的最小內容調整

兩個完整回覆都先區分專業店家／整新通路、刊登平台與個人交易，再提醒核對實機、賣家、付款、退換、電池及保固。這是本輪不納入正式排名的內容觀察，不是對個別競品服務的查核。`/used-phones` 因此新增「二手手機推薦平台怎麼選？」FAQ，明示推薦或商品量不代表每件手機都由平台檢測，並連至店家刊登與價格參考。沒有新增或捏造店家、商品、庫存、評論、認證、測評、保固或排名承諾。

驗證範圍：

```sh
node scripts/seo-measurement.mjs validate
node scripts/seo-measurement.mjs report
node --test scripts/seo-measurement.test.mjs
./node_modules/.bin/eslint --no-warn-ignored app/used-phones/page.tsx
npm run build
git diff --check
```

PR #5 已在本輪開始前由外部合併，本輪不再更新已合併 PR；改由最新 main 建立新的最小分支與 PR。新 PR 保持 open，不自行合併、不執行正式部署。Cloudflare PR 分支預覽若成功，也不等於正式站上線。
