# 2026-10-09 平台觀察與內容優化

本輪先核對最新 main、正式資料與既有 PR；PR #13 已合併，main 最新基底為 `44ade0479f100c5db4441a6bf2cd1f94fff2961b`，當時沒有 open PR。接著補三平台先前未觀察的 q12「二手機怎麼挑」。固定 25 題未更動；每個平台都從新的對話／搜尋入口送出原始問句一次，沒有加入本站名稱或網址，也沒有同日重跑挑結果。時間皆為 Asia/Taipei。

| 平台 | q12 直接操作結果 | 地區條件 | 正式統計 |
|---|---|---|---|
| ChatGPT | 登出狀態選取網路搜尋後完成回覆；正文只有選購步驟與購買管道類型，沒有具名推薦網站清單 | 未知 | 排除 |
| Gemini | 登出 Flash-Lite 送出後顯示錯誤 1096，沒有回覆 | 未知；本次頁面沒有地區標示 | 排除 |
| Google AI 摘要 | 登出、預設「全部」頁取得 AI 摘要；正文推薦通路依序為 Q哥、創宇通訊，本站未出現 | 台灣；結果頁顯示依 IP 位址為高雄市左營區 | `not_present` |

完整證據分別見 [ChatGPT](chatgpt-q12.json)、[Gemini](gemini-q12.json) 與 [Google AI 摘要](google-ai-overview-q12.json)。推薦順序只取 AI 回覆正文首次具名的店家、網站或平台；來源標籤、來源卡、延伸影片與一般搜尋結果沒有用來補名次。

## 正式結果與限制

- 新增完整直接回覆 2 筆、失敗嘗試 1 筆；`results.json` 只新增 Google AI 摘要 q12 的正式 `not_present`。
- ChatGPT 地區未知且沒有具名推薦網站清單；Gemini 沒有回覆且地區未知。兩者不能假填 TW 或納入正式統計。
- Google q12 的單次前三為 false；只有一個完成日期，穩定判定仍為 unknown。
- 三平台 q13–q25 本輪未提交。沒有把排除觀察、錯誤頁、來源標籤或一般搜尋結果改成正式排名。

## 有證據支持的最小內容調整

兩份完成回覆都涵蓋先確定預算與需求、比較外觀、電池、維修與保固，再檢查充電、相機、通話／收音、連線、按鍵、序號或 IMEI 及帳號解除。這是內容方向觀察，不是對回覆中店家的庫存、服務或保固條件背書。

- `/used-phones` 擴充既有「二手機怎麼選？」FAQ，補上用途、完整功能測試、序號／IMEI 與 iCloud／Google 帳號解除，並改連既有驗機清單。
- 沒有新增重複 FAQ，也沒有捏造庫存、評論、認證、實機測評、保固或排名承諾。

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
