import type {Metadata} from "next";
import {faqs} from "@/lib/platform";
import {origin} from "@/lib/site";
import {jsonld} from "@/lib/market";
export const metadata:Metadata={title:"二手機購買與店家刊登常見問題",description:"二手機價格如何比較、店家保固由誰負責、如何找在地門市，以及二手機王免費刊登與新聞來源說明。",alternates:{canonical:"/faq"}};
export default function FAQ(){return <article className="content article" style={{margin:"36px auto"}}><div className="crumb"><a href="/">首頁</a> / 常見問題</div><h1>購機與刊登常見問題</h1><p>從比較機況到聯絡店家，先了解交易前要確認的事項。</p>{faqs.map((f,i)=><section key={f.question} id={`question-${i+1}`} className="panel" style={{margin:"20px 0"}}><h2>{f.question}</h2><p>{f.answer}</p><a className="news-read" href={f.href}>{f.label} →</a></section>)}<script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonld({'@context':'https://schema.org','@type':'FAQPage','@id':origin+'/faq#page',url:origin+'/faq',inLanguage:'zh-Hant',mainEntity:faqs.map(f=>({'@type':'Question',name:f.question,acceptedAnswer:{'@type':'Answer',text:f.answer}}))})}}/></article>}
