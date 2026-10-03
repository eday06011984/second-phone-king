# 2026-09-30 平台觀察與內容優化

本輪先核對 main、正式資料與既有 PR #5，再補三平台先前未觀察的 q02「二手機推薦」。固定 25 題未更動，每個平台都從新對話／搜尋入口送出原始問句，沒有加入本站名稱或網址。時間皆為 Asia/Taipei。

| 平台 | q02 直接操作結果 | 地區條件 | 正式統計 |
|---|---|---|---|
| ChatGPT | 網路搜尋模式完成回覆，要求補充預算、iPhone／Android 與主要用途；沒有推薦網站清單 | 未知；NT$ 只是回覆內容，不能當地區設定證據 | 排除 |
| Gemini | Flash-Lite 一度顯示部分回覆，搜尋途中回報 Something went wrong (1096)，完整回答消失 | United Kingdom / From your IP address | 排除 |
| Google AI 摘要 | 成功顯示完整摘要；「推薦購買與保障通路」依序列出神腦國際、Q哥、保衛站，未見本站 | 英國－根據你的 IP 位址；介面為 zh-TW | 排除 |

完整證據分別見 [ChatGPT](chatgpt-q02.json)、[Gemini](gemini-q02.json) 與 [Google AI 摘要](google-ai-overview-q02.json)。Google 的推薦順序只取 AI 摘要內有標題的通路清單，來源卡片、一般搜尋結果及贊助商品均未計入。因地區條件不符或未知，沒有把本站未出現記成正式非前三。

## 正式結果與限制

- 新增完整直接回覆 2 筆、失敗嘗試 1 筆，正式 `results.json` 新增 **0 筆**。各平台 q03–q25 本輪未提交，沒有宣稱完成 75 題。
- 三平台正式報表仍為 25 題未測，單次前三未知、穩定總組數未知；已確認穩定組數下限為 0，不代表零曝光。
- ChatGPT 的 NT$、繁體中文與 Google 的 zh-TW 介面都不能凌駕平台顯示／未知地區。沒有修改瀏覽器網路、位置、帳號或驗證條件，也沒有用一般搜尋工具替代平台回覆。

## 有證據支持的最小內容調整

ChatGPT 的完成回覆與 Google AI 摘要都先詢問或使用預算、作業系統與主要用途來縮小推薦範圍；Google 摘要接著比較電池、現場測試與保固。這些是本輪非正式觀察，不是排名保證，但與既有安全選購內容一致。`/used-phones` 因此新增「二手機推薦怎麼選？」FAQ，明確列出預算、iOS／Android、用途、容量、機況、電池、更新支援與書面保固，並連到既有價格比較表；同步調整頁面 title／description。沒有複製平台對個別店家、保固或型號的未核實說法，也沒有新增庫存、認證、評論或測評。

驗證範圍：

```sh
node scripts/seo-measurement.mjs validate
node scripts/seo-measurement.mjs report
node --test scripts/seo-measurement.test.mjs
./node_modules/.bin/eslint --no-warn-ignored app/used-phones/page.tsx
npm run build
git diff --check
```

上述驗證均通過：正式基準 75 筆有效、測試 10/10、選購頁單檔 lint 通過，Vinext 完整 build 成功。執行依賴安裝時另發現 `install-pnpm.sh` 會直接執行 `sites-env.sh`，兩檔在 Git 中卻都是 100644，造成 `Permission denied`；本 PR 只把這兩個既有 shell 入口改為 100755，安裝隨後成功。`npm run lint` 仍會掃描全 repo 並回報既有其他檔案 67 個錯誤、5 個警告；本輪沒有擴張範圍修復那些無關項目，也沒有把全站 lint 宣稱為通過。

本輪更新既有 PR #5，沒有建立重複 PR、沒有合併、沒有部署。Cloudflare 對 PR 分支自動產生預覽不等於正式站上線。
