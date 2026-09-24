# LINE 登入測試站更新

此版本加入 LINE 登入及 Google 帳號主動綁定 LINE。僅開放測試站流程。
正式網站 DNS 不變；ChatGPT 平台登入尚未移植到 Cloudflare。

## 已完成的外部設定（依使用者回報）
- LINE Login channel: 2011719857，維持 Developing。
- Callback URL: https://second-phone-king.eday06011984.workers.dev/api/auth/line/callback
- Worker second-phone-king 的執行期 Secret: LINE_CHANNEL_SECRET。
- 不需要提供密鑰給開發人員，不放 GitHub。

## 部署順序
1. 備份 Cloudflare D1 後，在 second-phone-king-db 的 Console 執行 migration/line-auth.sql 全文。
   只建立 3 個登入資料表與索引，可重跑。不清空、不重匯 stores/listings/firebase_owner_links。
   也可於本專案目錄執行：
   npx wrangler d1 execute second-phone-king-db --remote --config migration/cloudflare-target.json --file migration/line-auth.sql
2. 把更新包內 UPLOAD-LINE 資料夾的「內容」上傳到 GitHub main 根目錄；保留 app、lib、components、migration 的資料夾階層，不要把 UPLOAD-LINE 本身上傳。
3. 提交變更後等 Cloudflare Git 自動建置部署成功。原有 pnpm run build 與 deploy 設定不變。
4. 開啟 https://second-phone-king.eday06011984.workers.dev/seller 測試。

## 驗收
- 先 Google 登入，確認原有流程正常。
- 原店家尚未完成所有權移轉者，不要重建店家。這次不更改原有 owner 對應。
- 若希望 Google 與 LINE 共用帳號，先用 Google 登入，點「綁定 LINE 至目前帳號」，授權自己的 LINE。
- Developing 階段只用具備該 LINE channel 角色權限的帳號測試。
- 綁定成功後登出，改用 LINE 登入，確認進入同一帳號／同一店家（若已存在）。
- 取消 LINE 授權應回到本站顯示取消訊息；重新登入可重試。
- 已連結其他平台帳號的 LINE 會拒絕自動合併，需另行人工驗證處理。
- LINE 首次直接登入會建立獨立的登入識別，不自動按電子郵件或姓名認領店家。
- 兩種登入 session 最長一小時；到期需重登。LINE 登出會刪除伺服器 session。
- 先不發布 LINE channel、不切換 DNS。正式域名的回呼需另加設定及程式調整。

## 驗證紀錄
- pnpm exec tsc --noEmit：通過。
- pnpm run build：通過（框架原有 middleware 棄用警告仍存在）。
- node migration/test-auth.mjs：Google 驗證與拒絕錯誤 token 測試通過。
- node migration/test-line.mjs：SQLite 實際執行 OAuth 狀態／session SQL；驗證 origin、PKCE、瀏覽器綁定、單次回呼、逾期、取消、登出、帳號衝突與 Google 帳號切換等案例通過。
- 測試中的外部 LINE 回應採 mock；尚未在你的 Cloudflare 遠端執行 migration、部署或實際 LINE 授權驗收。
- 店家、商品、新聞、照片資料與 Cloudflare target 設定沒有修改。

## 實作參考
https://developers.line.biz/en/docs/line-login/integrate-line-login/
https://developers.line.biz/en/reference/line-login/#verify-id-token
