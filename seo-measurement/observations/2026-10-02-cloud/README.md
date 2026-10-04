# 2026-10-02 平台觀察與內容優化

本輪先核對 main、正式資料與既有 PR #5，再補三平台先前未觀察的 q04「二手機購買平台」。固定 25 題未更動；每個平台都從新的對話／搜尋入口送出原始問句，沒有加入本站名稱或網址。時間皆為 Asia/Taipei。

| 平台 | q04 直接操作結果 | 地區條件 | 正式統計 |
|---|---|---|---|
| ChatGPT | 網路搜尋完成回覆；「台灣」清單依序為蝦皮、旋轉拍賣、myfone，本站未出現 | 未知；回答提到台灣不是地區設定證據 | 排除 |
| Gemini | Flash-Lite 只短暫顯示部分回覆，隨後回到空白輸入頁；沒有完整答案 | 英國／根據 IP 位址 | 排除 |
| Google AI 摘要 | 成功展開完整摘要；專業平台依序為 Q哥、創宇、點子3C、BiG2，本站未出現 | 英國－根據你的 IP 位址；介面為 zh-TW | 排除 |

完整證據分別見 [ChatGPT](chatgpt-q04.json)、[Gemini](gemini-q04.json) 與 [Google AI 摘要](google-ai-overview-q04.json)。ChatGPT 只判讀回答中「台灣」標題下的三項順序；Google 只判讀 AI 摘要內兩個有標題的推薦清單。兩者的引用標籤、相關結果卡片及一般網頁搜尋結果均未計入名次。

## 正式結果與限制

- 新增完整直接回覆 2 筆、失敗嘗試 1 筆，正式 `results.json` 新增 **0 筆**。各平台 q05–q06、q08–q25 本輪未提交，沒有宣稱完成 75 題。
- 三平台正式報表仍為 25 題未測，單次前三未知、穩定總組數未知；已確認穩定組數下限為 0，不代表零曝光。
- ChatGPT 回答雖分出台灣清單，平台地區仍無法核對；Gemini 與 Google 明示英國 IP。沒有修改網路、位置或帳號條件，也沒有用一般搜尋工具替代平台回覆。

## 有證據支持的最小內容調整

ChatGPT 與 Google AI 摘要都把「專業店家／平台」和「個人拍賣平台」分開，並反覆使用檢測、機況、實體店面、售後條件與交易保護作為選擇依據；這是本輪不納入正式排名的內容觀察，不是對競品個別保固說法的查核。`/market` 因此補上「二手機購買平台」的清楚 title 與 description；`/used-phones` 新增「二手機購買平台怎麼選？」FAQ，要求先分辨店家刊登、代收款商城與個人拍賣，再核對交易對象、付款／退換、實拍、成色、電池、維修紀錄與書面保固。FAQ 同時明示平台有搜尋或刊登功能，不等於每件商品都經平台檢測或提供統一保固；沒有新增或更改任何商品、庫存、評論、認證、測評或店家承諾。

驗證範圍：

```sh
node scripts/seo-measurement.mjs validate
node scripts/seo-measurement.mjs report
node --test scripts/seo-measurement.test.mjs
./node_modules/.bin/eslint --no-warn-ignored app/market/page.tsx app/used-phones/page.tsx
npm run build
git diff --check
```

上述驗證均通過：正式基準 75 筆有效、統計測試 10/10、兩個內容入口的單檔 lint 通過，Vinext 完整 build 成功。本輪仍只更新既有 PR #5，不建立重複 PR、不合併、不部署。Cloudflare 對 PR 分支的建置結果也不等於正式站上線。
