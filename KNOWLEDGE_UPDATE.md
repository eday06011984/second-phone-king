# 二手機王：知識網站第一階段更新

本更新已完成程式建置；尚未代為上傳 GitHub 或部署 Cloudflare。Google 前十、AI 推薦前三是追蹤目標，不是保證，也不是目前成果。

## 上傳方式
1. 先將下載 ZIP 解壓縮。
2. 開啟 GitHub 的 eday06011984/second-phone-king，選擇 main 分支，Add file → Upload files。
3. 進入 ZIP 內 UPLOAD-KNOWLEDGE 資料夾，將「裡面的」app、lib、content 資料夾及 KNOWLEDGE_UPDATE.md 拖入上傳區；不要上傳 UPLOAD-KNOWLEDGE 外層資料夾。
4. 檢查變更清單後 Commit changes。此覆蓋檔根據本次提供的 0705 原始碼製作；若 GitHub 後續另有修改，需先比對，避免覆蓋較新修改。
5. 若 Cloudflare 已連接這個分支，查看此次 build/deploy 是否成功；否則在原有部署流程發布同一個 commit。
6. 在 workers.dev 測試首頁、/guides、4 篇新指南、/market，以及 Google/LINE 登入、店家商品及照片。

建置指令：pnpm run build
部署指令（沿用既有設定）：pnpm exec wrangler deploy --config dist/server/wrangler.json
本次沒有修改遠端資料庫、登入設定、DNS 或照片儲存區。

## 內容與 SEO
首頁改成知識入口；原本商品頁功能移至 /market。新增 4 篇有官方來源及來源查核日期的指南，連同原有 4 篇共 8 篇。
新增指南具備獨立標題、描述、canonical、Open Graph 與 Article 結構化資料；sitemap 納入指南和 /market。
原有新聞、商品及店家資料保留。測試站的 noindex 保留；未切換正式網域前，測試站不應被收錄。

## 第一個月執行節奏
- 第 1 週：發布本次基礎內容、完成正式網域切換後的檢索檢查；記錄 Search Console 的曝光、點擊、索引基準。
- 第 2 週：優先補齊使用者問題：二手機驗機、啟用鎖定、電池健康度、更新支援、保固與價格比較。避免不同文章重複回答同一問題。
- 第 3 週：依實際搜尋查詢修正標題與內容，補充可驗證的機型比較與官方更新消息；沒有實測就不寫成評測。
- 第 4 週：比較曝光、點擊、索引頁數；依 SEO_MEASUREMENT.md 重複測試 AI 推薦，分平台記錄，保留未出現的結果。

每篇新增內容先核對官方來源、適用地區與日期。新聞最多每日 3 篇，有可靠新消息才發布；不要為湊數改日期或拼湊文章。本次未新增新聞排程，也未將舊 Sites 新聞排程搬至 Cloudflare。

## 驗證限制
TypeScript 與正式建置已通過。正式網站的 Search Console、AI 推薦排名、店家登入與正式資料庫操作，需在部署後以實際環境驗證；本檔不代表這些已通過。

本機預覽啟動遇到執行環境錯誤 uv_interface_addresses，尚未完成瀏覽器視覺驗證。
