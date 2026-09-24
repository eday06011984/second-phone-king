import {origin} from "@/lib/site";
import {jsonld} from "@/lib/market";
export const metadata={title:"二手機怎麼買？價格比較、驗機與店家挑選",description:"二手機選購從預算、容量、電池、維修紀錄到保固逐項比較。二手機王整理中古手機購買流程，連結店家商品、實體門市與驗機指南。",alternates:{canonical:"/used-phones"}};
const questions=[
["二手機怎麼選？","先決定總預算、作業系統和容量，再比較同型號的外觀、電池、維修紀錄與保固。價格之外，還要預留可能的換電池或配件支出。", "/", "查看店家刊登商品"],
["二手機哪裡買？","可向實體門市、網路店家或個人賣家購買。選擇時確認賣家聯絡方式、驗機安排、交易憑證與售後條件。二手機王提供店家刊登資訊，買家直接向店家確認庫存與交易。", "/stores", "尋找刊登店家"],
["二手機價格怎麼比較？","先固定型號和容量，再對照機況、電池與保固。刊登價是店家的售價資訊，不代表實際成交價或全市場行情；購買前應確認當日售價和庫存。", "/guides/compare-used-phone-prices", "閱讀價格比較方法"],
["二手 iPhone 購買前要檢查什麼？","檢查外觀、充電、相機、收音及螢幕，並確認裝置可以啟用。Apple 提醒不要購買仍有啟用鎖定的 iPhone；也應檢查電池資訊與可用的零件和維修記錄。", "/guides/used-phone-checklist", "開啟驗機清單"],
["電池健康度越高就越值得買嗎？","不能只靠一個百分比判斷。還要確認是否換過電池、零件來源、能否正常充電，以及電池是否在店家保固範圍內。", "/guides/battery-and-condition", "了解電池與成色"],
["二手機有保固嗎？","依商品與賣家條件而定。請取得書面期限、承保項目、排除條件與送修方式。店家保固與原廠保固不同，二手機王沒有為全部商品提供統一保固。", "/guides/store-warranty", "查看保固確認清單"],
["如何找附近可以驗機的二手機店家？","先查看店家所在地及地址，聯絡門市確認實機庫存、營業時間與可否現場驗機。不要只因店家頁面有地址，就假設該商品正在門市展示。", "/stores", "查看店家地址與聯絡方式"],
["通訊行可以免費刊登二手機嗎？","二手機王目前提供初期免費刊登，店家可建立專頁、管理商品，每件商品最多放六張照片。未來收費方案與時間尚未訂定，調整前會公告並由店家選擇。", "/join", "了解免費刊登方案"]
];
export default function Page(){return <article className="content article"><a className="crumb" href="/">首頁 ／ 二手機選購</a><h1>二手機怎麼買？從價格到保固，一次看懂。</h1><p>二手機是曾經使用或轉售的手機，外觀、電池與維修經歷可能各不相同。挑選時，把實際機況與售後條件一起比較，才能知道哪一支符合你的需要。</p><p className="muted">二手機王編輯整理・AI 輔助撰寫｜內容更新：2026 年 9 月 19 日</p><div className="panel"><h2>先選商品，再確認機況</h2><p>在二手機王查看店家自行刊登的中古手機，依你的需求比較，並直接聯絡賣家。平台提供資訊媒合，不代收款；店家資料與商品說明不等於平台認證。</p><a className="btn" href="/">找二手機</a>　<a className="btn light" href="/brands/Apple">找二手 iPhone</a></div>{questions.map(([q,a,url,label])=><section key={q}><h2>{q}</h2><p>{a}</p><a className="news-read" href={url}>{label} →</a></section>)}<h2>購買前可以直接問店家的問題</h2><p>「這支手機還在嗎？照片是否為實機？有沒有換過螢幕或電池？可以現場啟用和測試嗎？保固多久、包含哪些項目？總共需要支付多少？」將回答與商品頁一併保留，交機時逐項核對。</p><h2>資料來源與編輯原則</h2><p>iPhone 檢查事項參考 <a href="https://support.apple.com/zh-tw/104999" rel="noopener noreferrer" target="_blank">Apple：如果你想購買二手 iPhone</a>。價格比較及交易確認流程為本站編輯整理，不是實機評測或店家排名。商品個別資訊以刊登內容及賣家最新確認為準。</p><a href="/about">了解平台與編輯原則</a><script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonld({"@context":"https://schema.org","@graph":[{"@type":"FAQPage","@id":origin+"/used-phones#faq",url:origin+"/used-phones",mainEntity:questions.map(([q,a])=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a}}))},{"@type":"BreadcrumbList",itemListElement:[{"@type":"ListItem",position:1,name:"首頁",item:origin+"/"},{"@type":"ListItem",position:2,name:"二手機選購",item:origin+"/used-phones"}]}]})}}/></article>}
