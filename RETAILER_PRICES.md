# 網路店家二手機刊登價

功能位於 `/market`、品牌商品列表及 `/phones/[id]`。`/market` 的獨立市場參考區塊不依賴本站庫存；品牌和搜尋字詞會篩選參考機型，地區、預算與排序只作用於本站商品。外部價格不寫入本站 Product Offer 或庫存價格。

## 目前收錄的公開樣本

2026-10-04 人工讀取三家店的公開商品頁，記錄選定規格的價格及可見事實。未使用手機王資料，沒有自動爬蟲、定期抓取、外部 API 或授權待確認狀態。本機匯入不會自動發布；網站發布沿用既有 Cloudflare 流程。

- iPhone 13 128GB：尚禾通訊 6,300、神腦生活 6,999、強老闆 3C 樂天店 9,000 元；3 家等權均價 **7,433 元**，樣本範圍 6,300–9,000 元。
- iPhone 14 128GB：尚禾通訊 9,000 元，僅 1 家，**不提供均價**。
- 以上均為混合機況刊登價。iPhone 13 三筆中，2 筆稅別未明、1 筆庫存未經明示；原始成色、電池、保固及查核時間均在資料與 UI 中保留。強老闆樣本含副廠電池，不能當成原廠未拆修同機況。
- 所有來源成色都未與本站機況定義核對，`conditionVerified: false`；本次沒有足夠的嚴格同機況均價。
- 未收錄：已售完／下架商品、未選規格的起價或價格範圍、整新機混合價、優惠券條件價、相機曾更換的重大維修樣本及無法實際確認價格的網頁。搜尋摘要不當成已查核報價。

每筆直接來源 URL 與實際觀察時間見 `content/retailer-prices.json`。人工讀取公開價格事實不代表已取得商業授權；不複製產品圖片或行銷文案，亦不宣稱獲店家背書。資料已超過 7 天時自動停止顯示，重新匯入不會自動刷新時間。

## 兩種互相隔離的計算

### 混合機況刊登價參考

- 精確匹配品牌、機型、容量；只正規化大小寫、全半形與空白。
- 最近 7 天查核的固定 TWD 二手單機刊登價；排除整新、新機、回收、綁約、明列未稅、已售出及「起」價。
- 可保留稅別或庫存不明的刊登價，但必須保留 unknown/null，顯示提醒與原始機況；不能據此標記本站商品偏貴、較便宜或省多少。
- 至少 3 家獨立商家。先平均每店有效商品，再按店家等權平均，四捨五入至元；範圍取所有納入樣本的最低與最高價格。
- 樣本不足時，均價及均價範圍為 null；仍可閱讀有效單筆價格。即使本站沒有商品，此區也可使用。

### 嚴格同機況比較

在上述規則之外，機況必須已人工核對與本站定義相符、明確含稅、查核時有貨。原站 A／B／S 級不自動映射本站「近全新／輕微使用痕跡／明顯使用痕跡／有瑕疵，詳見說明」。至少 3 家才有同機況均價。

兩種結果分別回傳。即使同機況分類成立，電池、維修、配件與保固仍可能不同。均價只代表已收錄樣本，不是全網行情、成交價、含運總價或即時庫存保證。

## 去重與失效規則

- 同一 `storeKey` + `listingKey` 跨來源只留最新觀察；較新的售出或改規格紀錄會排除舊報價。
- 同時間的矛盾機況／價格／可售狀態會排除，直到有更晚且一致的觀察。
- 同一商家或連鎖共用 `storeKey`；跨站同一庫存共用 `listingKey`。身份鍵只接受小寫英數及 `. _ : -`，禁止空白、控制字元。
- `observedAt` 是實際看到頁面的時間，不是刊登或成交時間；不因匯入更新。
- 非法日期、未來觀察時間及過期資料不納入。資料在動態路由渲染時計算有效性。

## 資料格式（version 2）

頂層：`version: 2`、`updatedAt`（ISO 含時區，空資料可為 null）、`sources`、`quotes`。

來源：`id`、`name`、HTTPS `url`、`method: "manual-public-page" | "authorized-feed"`、`reference`（實際採集方式／來源依據）。這是來源紀錄，不是可自行授予的使用授權。不要放私人資料或憑證。

報價：

- `brand`、`model`、`storage`、`condition`；未核對本站機況填「未核對」。
- `sourceCondition` 保留來源成色；`conditionVerified` 僅代表與本站機況定義核對，並非只看到了來源等級。
- `storeKey`、`listingKey`、`storeName`、`sourceId`、HTTPS `url`。
- `price` 為 1–500000 的整數、`priceType: "fixed" | "from"`、`currency: "TWD"`、`taxIncluded: true | false | null`。
- `kind: "used-retail" | "refurbished-retail" | "new-retail" | "buyback" | "contract"`。
- `availability: "in-stock" | "sold" | "unknown"`、`observedAt`、`notes`（電池、保固、選定規格、可售及稅別等依據）。

## 本機匯入與驗證

```sh
node scripts/import-retailer-prices.mjs /path/to/retailer-quotes.json --check
node scripts/import-retailer-prices.mjs /path/to/retailer-quotes.json --write
npm test
npx tsc --noEmit
npm run build
```

預設只檢查；`--write` 原子替換本機資料，不發布。未知來源、來源紀錄缺漏、非 HTTPS、金額／日期不合格式均拒絕整份資料。建議每次採完整現況快照並保留已售出／撤下紀錄，避免舊價復活。

測試中的 example.com 價格純屬測試，正式 JSON 僅包含實際查核樣本。新增或更新正式樣本時應同步檢查稅別、機況與庫存事實，並更新正式樣本的迴歸斷言。
