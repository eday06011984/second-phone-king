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

1. 讀取 GitHub main 最新版本並確認今日篇數與重複主題。
2. 只提交新聞相關變更到 main，讓既有 Cloudflare 自動部署。
3. 完成必要建置、JSON schema、內容、SEO 與 sitemap 檢查。
4. 等待部署後，以正式網域驗證首頁、`/news`、每篇 `/news/[slug]` 與 sitemap。
5. 只有正式網域可讀且首頁、新聞列表已更新，才能回報「已發布」。若僅提交成功，必須明確標示「待部署」。
