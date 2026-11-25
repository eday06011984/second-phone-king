import Marketplace from "../marketplace";
import { allListings } from "@/lib/market";
import {
  withRetailerComparisons,
  retailerDataPending,
  retailerMarketOverview,
} from "@/lib/retailer-price-data";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "二手機比價與選購｜查店家刊登價、機況與所在地",
  description:
    "依品牌、預算與地區查看店家自行刊登的二手機，逐筆比較價格、成色與電池資訊，再直接向店家確認實機、庫存、維修紀錄及書面保固。",
  alternates: { canonical: "/market" },
};

export default async function Page() {
  let rows: Awaited<ReturnType<typeof allListings>> = [];
  let error = false;
  try {
    rows = withRetailerComparisons(await allListings());
  } catch (e) {
    console.error(e);
    error = true;
  }
  return (
    <>
    <Marketplace
      retailerReferences={retailerMarketOverview()}
      retailerDataPending={retailerDataPending}
      rows={rows}
      unavailable={error}
    />
    {!error && <section className="panel" aria-labelledby="brand-prices">
      <h2 id="brand-prices">各品牌二手機刊登價格</h2>
      <p>以下依本頁載入的商品計算。不同型號、容量與機況會拉大價差，點進品牌後可挑同規格比較。</p>
      <ul>{["Apple", "Samsung", "Google", "OPPO"].map(brand => {
        const prices = rows.filter(row => row.brand === brand).map(row => row.price)
          .filter(price => Number.isFinite(price) && price > 0);
        const format = (price: number) => price.toLocaleString("zh-TW");
        const low = Math.min(...prices);
        const high = Math.max(...prices);
        return <li key={brand}><a href={`/brands/${brand}`}>{brand === "Apple" ? "二手 iPhone" : `${brand} 二手機`}</a> · {prices.length ? `${prices.length} 件有標價，NT$ ${format(low)}${low === high ? "" : `～${format(high)}`}` : "目前沒有可比較的刊登價"}</li>;
      })}</ul>
      <p><a href="/guides/compare-used-phone-prices">怎麼比較同款二手機的總成本？</a> · <a href="/used-phones">第一次買二手機的選購指南</a></p>
    </section>}
    </>
  );
}
