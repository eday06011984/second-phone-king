# LINE 正式站登入更新

店家可選 Google 或 LINE 任一方式登入。LINE 直接登入不需要 Google 帳號。
Google 後台的「選用：連結 LINE 登入」只供想用兩種方式管理同一家店者使用。
獨立 LINE 身分不會依姓名或 email 自動認領既有 Google 店家。

## LINE Developers 設定

登入 https://developers.line.biz/console/，開啟 LINE Login channel 2011719857。
到 LINE Login 分頁的 Callback URL，保留測試網址，新增正式網址，每行一個：

https://xn--4kq449bj1fmzj.tw/api/auth/line/callback
https://second-phone-king.eday06011984.workers.dev/api/auth/line/callback

儲存。Cloudflare Worker 的 LINE_CHANNEL_SECRET 必須已設定，勿把密鑰放入 GitHub。
Developing 狀態僅 Admin / Tester 可登入。正式開放其他店家前，完成測試後將 channel 改為 Published；Published 無法改回 Developing。

## GitHub 部署

1. 將更新包 UPLOAD-LINE-PRODUCTION 內 app、lib、components、migration 四個資料夾上傳至 GitHub second-phone-king 的 main 根目錄。
   不要上傳外層 UPLOAD-LINE-PRODUCTION 資料夾。覆蓋同名檔案，不要刪除其他檔案。
2. Commit changes，等待 Cloudflare 自動建置部署成功。
3. 本更新不需要重跑 SQL，不修改店家、商品、照片、Google 帳號對應或 DNS。

## 驗收

1. 登出後，開啟 https://xn--4kq449bj1fmzj.tw/seller。
2. 直接選 LINE 登入，應前往 LINE 授權，並返回正式網域。
3. 首次獨立登入可進行店家建立；既有 LINE 帳號應回到自己的店家。
4. 若該店原本只屬於 Google，獨立 LINE 登入不會自動取得該店，勿重複建立既有店家。
5. 再確認 Google 可正常登入原店家。選用連結帳號不是驗收必備步驟。

## 本地測試

node migration/test-line.mjs
LINE_TEST_ORIGIN=https://second-phone-king.eday06011984.workers.dev node migration/test-line.mjs
pnpm exec tsc --noEmit
pnpm run build

OAuth 測試使用 SQLite，外部 LINE API 採模擬。涵蓋兩個核准網域、直接 LINE 登入、拒絕外部網域、跨網域回呼拒絕且不消耗原登入嘗試、PKCE、state/cookie、重放、到期、取消與帳號衝突。
真實 LINE 授權仍須部署與外部 callback 設定完成後確認。

官方說明：
https://developers.line.biz/en/docs/line-login/integrate-line-login/
https://developers.line.biz/en/docs/line-login/getting-started/
