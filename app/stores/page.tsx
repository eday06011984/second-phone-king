/* eslint-disable @next/next/no-html-link-for-pages -- Use native navigation: the deployed Vinext Link prefetch throws at runtime. */
import {db} from "@/lib/market";

export const dynamic="force-dynamic";
export const metadata={
  title:"二手機店家怎麼找？實體門市與現場驗機資訊",
  description:"依地區尋找刊登二手機的實體店家與商品，聯絡門市確認指定實機、現場驗機、價格、庫存及書面售後條件。",
  alternates:{canonical:"/stores"}
};

type StoreSummary={id:string;name:string;city:string;address:string};

export default async function Page(){
  let rows:StoreSummary[];
  try{
    rows=(await db().prepare("SELECT id,name,city,address FROM stores ORDER BY created DESC LIMIT 500").all<StoreSummary>()).results;
  }catch(e){
    console.error(e);
    return <p className="notice error">店家資料暫時無法載入，請稍後再試。</p>;
  }

  return <>
    <section className="intro">
      <div>
        <span className="label">在地店家</span>
        <h1>找二手機店家，先依地區與刊登商品縮小範圍。</h1>
        <p>查看門市地址與商品資訊，再直接聯絡店家確認指定實機、現場驗機與售後條件。</p>
      </div>
    </section>
    <section className="panel" aria-labelledby="store-checklist">
      <h2 id="store-checklist">挑二手機店家，到店前先確認 4 件事</h2>
      <p>詢問指定商品是否仍在店、能否查看刊登照片中的實機、現場可測試哪些功能，以及保固期限與排除項目能否提供書面紀錄。</p>
      <p className="muted">店家資料與商品由刊登者自行提供；有門市地址不等於每件商品都在現場。二手機王提供資訊媒合，不代收款，也不為所有商品提供統一保固。</p>
      <a className="news-read" href="/guides/used-phone-checklist">開啟現場驗機清單 →</a>　
      <a className="news-read" href="/guides/store-warranty">查看保固確認清單 →</a>
    </section>
    {rows.length?<div className="storelist">{rows.map(r=><a className="panel" href={`/stores/${r.id}`} key={r.id}>
      <span className="badge">{r.city}</span>
      <h2 style={{marginTop:15}}>{r.name}</h2>
      <p>{r.address}</p>
      <span className="arrow">查看店家商品 →</span>
    </a>)}</div>:<div className="empty" style={{marginBottom:35}}>
      <h2>首批店家招募中</h2>
      <p>建立店家頁，讓買家找到你的商品與門市。</p>
      <a className="btn" href="/seller">免費加入</a>
    </div>}
  </>;
}
