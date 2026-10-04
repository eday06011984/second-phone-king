import { MAX_QUOTE_AGE_DAYS, MIN_RETAILER_STORES, type PriceSampleSummary, type RetailerComparison, type RetailerMarketReference } from '@/lib/retailer-prices';

const money = (value: number) => `NT$ ${value.toLocaleString('zh-TW')}`;
const observedTime = (value: string) => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value));
export function RetailerPriceMethod({ pending = false }: { pending?: boolean }) {
  return <section className="retailer-method panel" aria-label="網路店家售價比較說明">
    <h2>網路店家二手機價格</h2>
    {pending && <p className="retailer-pending">尚無收錄的店家報價</p>}
    <p>直接查核店家公開商品頁，依品牌、機型與容量整理刊登售價。不同店家的成色、電池、維修與保固條件可能不同。</p>
    <details><summary>均價怎麼算？</summary><p>採最近 {MAX_QUOTE_AGE_DAYS} 天內查核、至少 {MIN_RETAILER_STORES} 家不同店家的固定二手單機刊登價；同店先平均，再讓各店等權平均，四捨五入至元。排除新機、整新機、收購、綁約、已售出、明列未稅及「起」價，不計運費或選購項目。</p><p>「混合機況參考」保留店家原始成色，稅別或庫存未明會逐筆標示；不可據此判定本站某商品偏貴或便宜。只有機況已核對一致、含稅且有貨的樣本，才另列「同機況均價」。</p><p>這是已收錄樣本的公開刊登價，並非全網即時行情或成交價。查核時間不等於店家調價時間，超過 {MAX_QUOTE_AGE_DAYS} 天會停止顯示；不會自動刷新或重設查核日期。</p></details>
  </section>;
}
function unavailableText(result: PriceSampleSummary) {
  if (result.status === 'pending-data') return '尚無收錄的店家報價';
  if (result.status === 'unknown-condition') return '機況未能對應，暫無可比較均價';
  return `樣本不足 ${MIN_RETAILER_STORES} 家，暫不計算均價（${result.storeCount} 家／${result.listingCount} 筆）`;
}
function Observation({ result }: { result: PriceSampleSummary }) {
  return result.newestObservedAt ? <p className="muted">最近查核：<time dateTime={result.newestObservedAt}>{observedTime(result.newestObservedAt)}</time>（臺灣時間）{result.oldestObservedAt !== result.newestObservedAt && <>；最早樣本：<time dateTime={result.oldestObservedAt!}>{observedTime(result.oldestObservedAt!)}</time></>}</p> : null;
}
function QuoteSources({ result }: { result: PriceSampleSummary }) {
  return result.quotes.length > 0 && <details className="retailer-sources"><summary>查看 {result.listingCount} 筆價格、機況與來源</summary><ul>{result.quotes.map(quote => <li key={`${quote.storeKey}-${quote.listingKey}`}><a href={quote.url} target="_blank" rel="noopener noreferrer">{quote.storeName} · {money(quote.price)}</a><span>原始成色：{quote.sourceCondition} · {quote.taxIncluded === true ? '含稅' : quote.taxIncluded === false ? '未稅' : '稅別未明'} · {quote.availability === 'in-stock' ? '查核時頁面標示可購買' : '庫存待店家確認'}</span>{quote.notes && <span>{quote.notes}</span>}<span>查核：<time dateTime={quote.observedAt}>{observedTime(quote.observedAt)}</time>（臺灣時間）</span></li>)}</ul></details>;
}
export function RetailerMarketReferenceCard({ result, showModel = true }: { result: RetailerMarketReference; showModel?: boolean }) {
  return <article className="retailer-reference">
    {showModel && <h3>{result.model} <span>{result.storage}</span></h3>}
    <span className="retailer-reference-label">混合機況刊登價參考</span>
    {result.status === 'available' ? <><div className="retailer-average">{money(result.average!)}</div><p>{result.storeCount} 家店・{result.listingCount} 筆・店家等權均價</p><p>樣本範圍：{money(result.minimum!)} ～ {money(result.maximum!)}</p></> : <p className="retailer-pending">{unavailableText(result)}</p>}
    {result.status !== 'available' && result.listingCount === 1 && <p className="retailer-single-price">單店刊登：{money(result.quotes[0].price)}</p>}
    <p className="retailer-caveat">成色、電池與保固不同，非同機況比價。{result.unknownTaxCount > 0 && ` ${result.unknownTaxCount} 筆未確認稅別。`}{result.unknownAvailabilityCount > 0 && ` ${result.unknownAvailabilityCount} 筆庫存待確認。`}</p>
    <Observation result={result}/><QuoteSources result={result}/>
  </article>;
}
export function RetailerMarketOverview({ references, brand = '全部品牌', query = '' }: { references: RetailerMarketReference[]; brand?: string; query?: string }) {
  const normalized = query.normalize('NFKC').toLowerCase().replace(/\s+/g, '');
  const visible = references.filter(row => (brand === '全部品牌' || row.brand === brand) && (`${row.brand}${row.model}${row.storage}`.normalize('NFKC').toLowerCase().replace(/\s+/g, '').includes(normalized) || row.quotes.some(quote => quote.storeName.toLowerCase().includes(query.toLowerCase()))));
  return <section id="market-reference-results" className="retailer-market" aria-label="二手機市場刊登價參考">
    <div className="sectionhead"><h2>店家刊登價參考</h2><span className="muted">同機型・同容量</span></div>
    <p className="muted">與本站商品分開收錄。以下依品牌與搜尋字詞篩選；預算及地區篩選僅套用到下方本站商品。</p>
    {visible.length > 0 ? <div className="retailer-reference-grid">{visible.map(result => <RetailerMarketReferenceCard key={`${result.brand}-${result.model}-${result.storage}`} result={result}/>)}</div> : <p className="notice">此篩選條件尚無 {MAX_QUOTE_AGE_DAYS} 天內的店家價格樣本，暫不提供均價。</p>}
  </section>;
}
export function RetailerPriceSummary({ result }: { result?: RetailerComparison }) {
  if (!result) return null;
  const reference = result.marketReference;
  return <div className="retailer-summary">{result.status === 'available' ? <><span>同機況店家均價</span><strong>{money(result.average!)}</strong><small>{result.storeCount} 家店・{result.listingCount} 筆同機況報價</small></> : reference.status === 'available' ? <><span>混合機況刊登均價</span><strong>{money(reference.average!)}</strong><small>{reference.storeCount} 家店・成色、電池與保固可能不同，非同機況比價{reference.unknownTaxCount > 0 && '・部分稅別未明'}{reference.unknownAvailabilityCount > 0 && '・部分庫存待確認'}</small></> : <><span>同機況店家均價</span><small>{unavailableText(result)}</small></>}</div>;
}
export default function RetailerPriceComparison({ result }: { result: RetailerComparison }) {
  return <section className="retailer-comparison" aria-label="網路店家售價參考">
    <h2>同機況店家平均售價</h2>
    {result.status === 'available' ? <><div className="retailer-average">{money(result.average!)}</div><p>已收錄 {result.storeCount} 家店・{result.listingCount} 筆同型號、容量與機況報價</p><p>報價範圍：{money(result.minimum!)} ～ {money(result.maximum!)}</p></> : <p className="retailer-pending">{unavailableText(result)}</p>}
    <Observation result={result}/><QuoteSources result={result}/>
    <p className="muted">{MAX_QUOTE_AGE_DAYS} 天內至少 {MIN_RETAILER_STORES} 家店才提供均價；同機況比較僅納入已確認含稅且有貨的價格。刊登價不等於成交價。</p>
    {result.marketReference.listingCount > 0 && <RetailerMarketReferenceCard result={result.marketReference} showModel={false}/>}
    <details><summary>計算方式</summary><p className="muted">同一商品跨來源去重；每家店內先平均，再按店家等權計算。A／B 等級不自行換算成本站機況。混合機況參考保留未確認稅別或庫存的樣本並明示，不用來判定本商品偏貴或便宜。</p></details>
  </section>;
}
