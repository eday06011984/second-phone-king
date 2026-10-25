import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relatedGuideSlugs,newsGuideSlugs,relatedGuides,newsGuides,relatedNews} from '../lib/topical-links.ts';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const knowledge=JSON.parse(read('content/knowledge.json'));
const market=read('lib/market.ts');
const guides=[...knowledge,...Array.from(market.matchAll(/slug:"([^"]+)",title:"([^"]+)"/g),m=>({slug:m[1],title:m[2]}))];
const news=JSON.parse(read('content/news.json'));
const valid=new Set(guides.map(g=>g.slug));

test('every guide has an explicit topical relationship with valid unique non-self targets',()=>{
 assert.ok(guides.length>=9);
 assert.deepEqual(Object.keys(relatedGuideSlugs).sort(),[...valid].sort());
 for(const [slug,targets] of Object.entries(relatedGuideSlugs)){
  assert.equal(new Set(targets).size,targets.length);
  for(const target of targets){assert.ok(valid.has(target),target);assert.notEqual(slug,target);}
 }
});
test('guide selection follows editorial order and does not mutate inputs',()=>{
 const snapshot=JSON.stringify(guides);
 const selected=relatedGuides('store-warranty',guides);
 assert.deepEqual(selected.map(g=>g.slug),relatedGuideSlugs['store-warranty']);
 assert.equal(JSON.stringify(guides),snapshot);
});
test('fallback skips missing, duplicate and self targets and only returns available guides',()=>{
 const available=[{slug:'store-warranty',title:'Warranty'},{slug:'only-other',title:'Other'},{slug:'only-other',title:'Other'}];
 assert.deepEqual(relatedGuides('store-warranty',available).map(g=>g.slug),['only-other']);
 assert.deepEqual(relatedGuides('new-guide',available).map(g=>g.slug),['store-warranty','only-other']);
 assert.deepEqual(relatedGuides('new-guide',[]),[]);
});
test('every explicit news relationship points from a real article to valid unique guides',()=>{
 const slugs=new Set(news.map(n=>n.slug));
 for(const [slug,targets] of Object.entries(newsGuideSlugs)){
  assert.ok(slugs.has(slug),slug);assert.equal(new Set(targets).size,targets.length);
  for(const target of targets)assert.ok(valid.has(target),target);
  assert.deepEqual(newsGuides(slug,guides).map(g=>g.slug),targets);
 }
});
test('unknown news does not acquire guessed topical recommendations',()=>{
 assert.deepEqual(newsGuides('unreviewed-topic',guides),[]);
 assert.deepEqual(newsGuides('one-ui-9-used-galaxy-update',[]),[]);
});
test('related news prioritizes category then preserves existing order without self/duplicates',()=>{
 const current={slug:'current',category:'phone'};
 const available=[{slug:'other',category:'pc'},current,{slug:'related',category:'phone'},{slug:'related',category:'phone'},{slug:'third',category:'pc'},{slug:'fourth',category:'pc'}];
 const snapshot=JSON.stringify(available);
 assert.deepEqual(relatedNews(current,available).map(n=>n.slug),['related','other','third']);
 assert.equal(JSON.stringify(available),snapshot);
 assert.deepEqual(relatedNews(current,[current]),[]);
});
test('news CTA goes directly to marketplace and page templates emit native anchor hrefs',()=>{
 const page=read('app/news/[slug]/page.tsx');
 assert.match(page,/<a className="btn" href="\/market">找二手機<\/a>/);
 assert.doesNotMatch(page,/<a className="btn" href="\/">找二手機<\/a>/);
 assert.match(page,/<a href=\{"\/guides\/"\+g\.slug\}>\{g\.title\}<\/a>/);
 assert.match(page,/relatedNews\(n,news\)/);
 const guide=read('app/guides/[slug]/page.tsx');
 assert.match(guide,/relatedGuides\(slug,\[\.\.\.knowledge,\.\.\.guides\]\)/);
 assert.match(guide,/<a href=\{'\/guides\/'\+x\.slug\}>\{x\.title\}<\/a>/);
});


test('keyboard navigation bypasses the shared header and focuses a unique main landmark',()=>{
 const layout=read('app/layout.tsx');
 assert.match(layout, /<body><a className="skip-link" href="#main-content">跳至主要內容<\/a><header>/);
 assert.match(layout, /<main id="main-content" tabIndex=\{-1\} className="wrap">/);
 assert.equal((layout.match(/id="main-content"/g)||[]).length,1);
 const css=read('app/globals.css');
 assert.match(css,/\.skip-link:focus\{transform:translateY\(0\)/);
});

test('search exposes selection and result changes and offers buyers a filter recovery action',()=>{
 const market=read('app/marketplace.tsx');
 assert.match(market,/aria-pressed=\{brand===b\}/);
 assert.match(market,/role="status" aria-live="polite" aria-atomic="true"/);
 assert.match(market,/const clearFilters=\(\)=>\{setBrand\('全部品牌'\);setCity\('全部地區'\);setBudget\('不限預算'\);setQuery\(''\)\}/);
 assert.equal((market.match(/onClick=\{clearFilters\}/g)||[]).length,2);
 assert.match(market,/rows.length\?<button type="button" className="btn light" onClick=\{clearFilters\}>清除篩選，查看全部商品/);
 assert.doesNotMatch(market,/rows.length\?'我要刊登商品'/);
});
