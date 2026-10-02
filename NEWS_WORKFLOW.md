# 二手機王新聞更新

Repository: eday06011984/second-phone-king
Branch: main
Production Worker: second-phone-king
Public site: https://xn--4kq449bj1fmzj.tw

## 唯一發布流程

正式網站已遷移至 Cloudflare Worker。唯一有效來源是上述 GitHub repository 的 main 分支；Cloudflare 依 main 自動建置與部署。

禁止使用或部署舊 Sites project `appgprj_6aab4c1b3ec48191acdcdc53c98dc515`，禁止恢復舊網域綁定，也不得建立替代 Sites project。每次更新前先確認 GitHub 讀寫權限並讀取 main 最新版本；沒有權限就回報受阻，不得回退舊站或宣稱刊登成功。

## 內容格式

新聞只追加至 `content/news.json`，並保留既有文章、店家、商品、登入、D1 資料、R2 圖片與網域設定。欄位如下：

- `slug`：唯一 ASCII kebab-case
- `title`
- `category`
- `description`
- `publishedAt`、`updatedAt`：含時區的實際 ISO timestamp
- `sections: [{ heading, paragraphs: [string] }]`
- `sources: [{ name, url, date }]`，其中 date 為原始來源日期 `YYYY-MM-DD`

首頁、`/news`、`/news/[slug]` 與 sitemap 由既有程式自動生成。不得改動店家與商品資料。

## 編輯原則

每次依 Asia/Taipei 當日已刊登篇數補足至 3 篇，重跑必須去重。優先最近 48 小時的手機新品、更新、二手機市場、購機與 3C 配件消息，不足再延至 7 天，並適度分散品牌。可靠題材不足時少發並說明，禁止倒填日期或湊篇數。

所有內容採原創繁體中文整理，查核官方原始來源與消息日期，清楚區分事實與編輯分析；不得抄寫新聞稿、編造測試、價格或規格，也不得堆砌關鍵字。來源要附可靠連結與日期，不得宣稱保證 Google 索引或排名。

## 發布與驗證

### 推送前資料驗收（零外部依賴）

- `npm run test:news`：Node 內建測試，含缺少 sections、重複 slug、壞 URL、壞日期，以及以本機 git stub 確認失敗不會到達 commit／push 的測試。
- `npm run validate:news`：唯讀檢查完整 `content/news.json`；也可執行 `node scripts/validate-news.mjs <檔案路徑>`。
- 必要文字欄位須為非空字串；sections、paragraphs、sources 須為非空陣列，逐項檢查物件與文字型別；slug 須為唯一 ASCII kebab-case。
- 來源 URL 須為可解析的絕對 HTTP(S) URL，不接受帳密、空白或反斜線。這不代表連結可連線或內容已查證。
- 刊登／更新時間須為含時區的有效 ISO timestamp（接受既有微秒精度），拒絕不存在日期，更新不得早於刊登，未來時間僅容許 5 分鐘時鐘誤差。
- 來源日期須為有效 `YYYY-MM-DD`，不得晚於台北當日或最後更新的台北日期；可在更新時補較新的來源。舊文章與舊來源不套用 48 小時／7 天選題限制。
- 每日 workflow 在產生新聞後、commit／push 前執行驗收。讀檔、JSON 解析、資料或測試失敗均以非零 exit code 停止；寫入步驟另有 success gate，沒有 continue-on-error。
- 通過僅代表資料格式與基本時間關係合格，不代表事實查核、建置、SEO、正式部署或正式網址驗證完成。

1. 讀取 GitHub main 最新版本並確認今日篇數與重複主題。
2. 只提交新聞相關變更到 main，讓既有 Cloudflare 自動部署。
3. 完成必要建置、JSON schema、內容、SEO 與 sitemap 檢查。
4. 等待部署後，以正式網域驗證首頁、`/news`、每篇 `/news/[slug]` 與 sitemap。
5. 只有正式網域可讀且首頁、新聞列表已更新，才能回報「已發布」。若僅提交成功，必須明確標示「待部署」。
