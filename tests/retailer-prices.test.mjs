import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import { loadRetailerPriceModule } from '../scripts/load-retailer-price-module.mjs';

const { compareRetailerPrices, validateRetailerDataset, retailerMarketReference, retailerMarketReferences, MAX_QUOTE_AGE_DAYS } = await loadRetailerPriceModule();
const now = Date.parse('2026-10-04T01:00:00Z');
const phone = { brand: 'Apple', model: 'iPhone 16', storage: '256GB', condition: '輕微使用痕跡' };
const source = { id: 'fixture', name: 'TEST FIXTURE ONLY', url: 'https://example.com', method: 'manual-public-page', reference: 'Synthetic local test data only' };
const quote = (storeKey, price = 18000, patch = {}) => ({ ...phone, storeKey, listingKey: `${storeKey}-one`, storeName: storeKey, sourceId: source.id, url: `https://example.com/${storeKey}`, price, priceType: 'fixed', notes: '', currency: 'TWD', taxIncluded: true, kind: 'used-retail', availability: 'in-stock', observedAt: '2026-10-04T00:00:00Z', sourceCondition: '輕微使用痕跡', conditionVerified: true, ...patch });
const dataset = quotes => ({ version: 2, updatedAt: '2026-10-04T01:00:00Z', sources: [source], quotes });
const compare = quotes => compareRetailerPrices(phone, dataset(quotes), now);

test('empty dataset is explicit pending and never shows zero as a price', () => {
  const data = validateRetailerDataset(dataset([]));
  const result = compareRetailerPrices(phone, data, now);
  assert.equal(result.status, 'pending-data');
  assert.equal(result.average, null);
  assert.equal(result.minimum, null);
});
test('three distinct merchants; average per store first, then equal weight', () => {
  const result = compare([quote('a', 10000), quote('a', 20000, { listingKey: 'a-two' }), quote('b', 18000), quote('c', 24000)]);
  assert.equal(result.status, 'available');
  assert.equal(result.average, 19000);
  assert.equal(result.storeCount, 3);
  assert.equal(result.listingCount, 4);
  assert.equal(result.minimum, 10000);
  assert.equal(result.maximum, 24000);
  assert.equal(result.newestObservedAt, '2026-10-04T00:00:00Z');
});
test('one or two stores never become an average, regardless of listing count', () => {
  for (const rows of [[quote('a')], [quote('a'), quote('b'), quote('a', 17000, { listingKey: 'a-two' })]]) {
    const result = compare(rows);
    assert.equal(result.status, 'insufficient-samples');
    assert.equal(result.average, null);
    assert.equal(result.minimum, null);
  }
});
test('match exact model, storage and condition; normalize typography only', () => {
  const variants = [{ model: 'iPhone 16 Pro' }, { model: 'iPhone 16 Pro Max' }, { storage: '128GB' }, { condition: '近全新' }, { brand: 'Samsung' }, { sourceCondition: 'A', condition: 'A', conditionVerified: false }];
  for (const patch of variants) assert.equal(compare([quote('a'), quote('b'), quote('c', 18000, patch)]).status, 'insufficient-samples');
  assert.equal(compare([quote('a'), quote('b'), quote('c', 18000, { brand: 'APPLE', model: 'iPhone  16', storage: '256 GB' })]).status, 'available');
  assert.equal(compareRetailerPrices({ ...phone, condition: 'A' }, dataset([]), now).status, 'unknown-condition');
});
test('exclude new, buyback, contract, unavailable, unverified grade and tax', () => {
  for (const patch of [{ kind: 'new-retail' }, { kind: 'refurbished-retail' }, { priceType: 'from' }, { kind: 'buyback' }, { kind: 'contract' }, { availability: 'sold' }, { availability: 'unknown' }, { conditionVerified: false }, { taxIncluded: false }, { taxIncluded: null }, { currency: 'USD' }]) {
    assert.equal(compare([quote('a'), quote('b'), quote('c', 18000, patch)]).storeCount, 2);
  }
});
test('stale, future and malformed timestamps are excluded, not silently refreshed', () => {
  for (const observedAt of [new Date(now - (MAX_QUOTE_AGE_DAYS * 86400000) - 1).toISOString(), new Date(now + 1).toISOString(), 'bad']) {
    assert.equal(compare([quote('a'), quote('b'), quote('c', 18000, { observedAt })]).storeCount, 2);
  }
  assert.equal(compare([quote('a'), quote('b'), quote('c', 18000, { observedAt: new Date(now - MAX_QUOTE_AGE_DAYS * 86400000).toISOString() })]).storeCount, 3);
});
test('deduplicate inventory and use newest status before filtering', () => {
  const old = quote('a', 10000, { observedAt: '2026-10-03T00:00:00Z' });
  assert.equal(compare([old, quote('a', 20000), quote('b', 20000), quote('c', 20000)]).average, 20000);
  assert.equal(compare([old, quote('a', 20000, { availability: 'sold' }), quote('b'), quote('c')]).storeCount, 2);
});
test('source collection provenance is required; invalid imports fail closed', () => {
  const data = dataset([quote('a')]);
  assert.deepEqual(validateRetailerDataset(data), data);
  assert.throws(() => validateRetailerDataset({ ...data, sources: [{ ...source, method: 'unverified' }] }), /source/);
  assert.throws(() => validateRetailerDataset({ ...data, sources: [{ ...source, reference: '' }] }), /reference/);
  assert.throws(() => validateRetailerDataset({ ...data, sources: [source, source] }), /duplicate/);
  assert.throws(() => validateRetailerDataset({ ...data, updatedAt: null }), /update time/);
  assert.equal(compareRetailerPrices(phone, { ...data, sources: [{ ...source, method: 'unverified' }] }, now).storeCount, 0);
  for (const patch of [{ price: 0 }, { price: -1 }, { price: 1.5 }, { price: 500001 }, { price: '18000' }, { url: 'javascript:alert(1)' }, { url: 'http://example.com' }, { observedAt: '2026-10-04' }, { sourceId: 'unknown' }, { taxIncluded: undefined }]) assert.throws(() => validateRetailerDataset(dataset([quote('a', 18000, patch)])));
});

test('ambiguous same-instant inventory is excluded regardless of order', () => {
  const active = quote('a');
  const sold = quote('a', 18000, { availability: 'sold' });
  for (const rows of [[active, sold], [sold, active]]) {
    assert.equal(compare([...rows, quote('b'), quote('c')]).storeCount, 2);
    assert.equal(compare([...rows, quote('a', 18000, { observedAt: '2026-10-04T00:30:00Z' }), quote('b'), quote('c')]).storeCount, 3);
  }
  assert.equal(compare([active, active, quote('b'), quote('c')]).listingCount, 3);
});
test('calendar-invalid ISO timestamps cannot roll over into fresh observations', () => {
  for (const observedAt of ['2026-09-31T00:00:00Z', '2026-02-29T00:00:00Z', '2026-10-04T24:00:00Z', '2026-10-04T00:00:00+14:30']) {
    assert.throws(() => validateRetailerDataset(dataset([quote('a', 18000, { observedAt })])));
    assert.equal(compare([quote('a'), quote('b'), quote('c', 18000, { observedAt })]).storeCount, 2);
  }
});

test('production dataset has valid schema without assuming it remains empty', async () => {
  validateRetailerDataset(JSON.parse(await readFile(new URL('../content/retailer-prices.json', import.meta.url), 'utf8')));
});
test('canonical identities cannot pad one merchant into multiple stores', () => {
  for (const storeKey of ['a ', ' a', 'A', 'a\u0000', 'a\n']) {
    assert.throws(() => validateRetailerDataset(dataset([quote(storeKey)])));
    assert.equal(compare([quote('a'), quote('b'), quote(storeKey)]).status, 'insufficient-samples');
  }
  assert.throws(() => validateRetailerDataset(dataset([quote('a', 18000, { listingKey: ' a-one' })])));
});
test('equivalent offsets conflict at the same instant, valid leap days pass', () => {
  const active = quote('a');
  const sold = quote('a', 18000, { availability: 'sold', observedAt: '2026-10-04T08:00:00+08:00' });
  for (const rows of [[active, sold], [sold, active]]) assert.equal(compare([...rows, quote('b'), quote('c')]).storeCount, 2);
  validateRetailerDataset(dataset([quote('a', 18000, { observedAt: '2024-02-29T00:00:00Z' })]));
});


test('mixed-condition reference keeps explicit uncertainties separate from comparisons', () => {
  const rows = [quote('a', 6300, { condition: '未核對', conditionVerified: false, sourceCondition: '中古', taxIncluded: null, availability: 'unknown' }), quote('b', 6999, { condition: '未核對', conditionVerified: false, sourceCondition: 'B+' }), quote('c', 9000, { condition: '未核對', conditionVerified: false, sourceCondition: 'A', taxIncluded: null })];
  const result = compare(rows);
  assert.equal(result.status, 'insufficient-samples');
  assert.equal(result.average, null);
  assert.equal(result.storeCount, 0);
  assert.equal(result.marketReference.status, 'available');
  assert.equal(result.marketReference.basis, 'mixed-condition-asking');
  assert.equal(result.marketReference.average, 7433);
  assert.equal(result.marketReference.minimum, 6300);
  assert.equal(result.marketReference.maximum, 9000);
  assert.equal(result.marketReference.unknownTaxCount, 2);
  assert.equal(result.marketReference.unknownAvailabilityCount, 1);
  assert.deepEqual(result.marketReference.quotes.map(row => row.sourceCondition), ['中古', 'B+', 'A']);
});
test('mixed reference does not relax model, capacity, freshness, price type or stock exclusions', () => {
  for (const patch of [{ model: 'iPhone 16 Pro' }, { storage: '128GB' }, { availability: 'sold' }, { taxIncluded: false }, { taxIncluded: undefined }, { priceType: 'from' }, { kind: 'refurbished-retail' }, { kind: 'new-retail' }, { kind: 'contract' }, { kind: 'buyback' }, { observedAt: '2026-09-01T00:00:00Z' }]) {
    const reference = retailerMarketReference(phone, dataset([quote('a'), quote('b'), quote('c', 18000, patch)]), now);
    assert.equal(reference.storeCount, 2);
    assert.equal(reference.average, null);
    assert.equal(reference.minimum, null);
  }
});
test('mixed reference preserves deduplication, newest-status invalidation and merchant weighting', () => {
  const rows = [quote('a', 10000), quote('a', 20000, { listingKey: 'a-two' }), quote('b', 18000), quote('c', 24000), quote('a', 9000, { observedAt: '2026-10-03T00:00:00Z' })];
  assert.equal(retailerMarketReference(phone, dataset(rows), now).average, 19000);
  assert.equal(retailerMarketReference(phone, dataset([...rows, quote('c', 24000, { observedAt: '2026-10-04T00:30:00Z', availability: 'sold' })]), now).storeCount, 2);
});
test('standalone overview is independent of site inventory and groups exact models and storage', () => {
  const rows = [quote('a'), quote('b'), quote('c'), quote('a', 20000, { listingKey: 'a-pro', model: 'iPhone 16 Pro' }), quote('a', 21000, { listingKey: 'a-512', storage: '512GB' })];
  const overview = retailerMarketReferences(dataset(rows), now);
  assert.equal(overview.length, 3);
  assert.equal(overview.filter(row => row.status === 'available').length, 1);
  assert.equal(retailerMarketReferences(dataset(rows), now + 8 * 86400000).length, 0);
});
test('unknown site condition still permits a separately labeled mixed-condition reference', () => {
  const result = compareRetailerPrices({ ...phone, condition: '來源等級未核對' }, dataset([quote('a'), quote('b'), quote('c')]), now);
  assert.equal(result.status, 'unknown-condition');
  assert.equal(result.average, null);
  assert.equal(result.marketReference.status, 'available');
});
test('real observed iPhone 13 dataset produces the auditable three-retailer reference only', async () => {
  const data = validateRetailerDataset(JSON.parse(await readFile(new URL('../content/retailer-prices.json', import.meta.url), 'utf8')));
  const result = compareRetailerPrices({ brand: 'Apple', model: 'iPhone 13', storage: '128GB', condition: '輕微使用痕跡' }, data, Date.parse(data.updatedAt));
  assert.equal(result.marketReference.storeCount, 3);
  assert.equal(result.marketReference.average, 7433);
  assert.equal(result.marketReference.unknownTaxCount, 2);
  assert.equal(result.average, null);
  assert.ok(data.quotes.every(row => !row.url.includes('sogi.com.tw')));
  assert.equal(retailerMarketReferences(data, Date.parse(data.updatedAt) + 8 * 86400000).length, 0);
});


test('rendered reference labels uncertainty and retains direct source links and single-store prices', async () => {
  const componentSource = (await readFile(new URL('../components/retailer-price-comparison.tsx', import.meta.url), 'utf8')).replace("'@/lib/retailer-prices'", "'./retailer-prices.mjs'");
  const compiled = ts.transpileModule(componentSource, { fileName: 'retailer-price-comparison.tsx', compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const moduleUrl = new URL('../.sites-runtime/retailer-prices/retailer-price-comparison.mjs', import.meta.url);
  await writeFile(moduleUrl, compiled);
  const { RetailerMarketOverview, RetailerPriceSummary, default: Comparison } = await import(moduleUrl.href);
  const data = validateRetailerDataset(JSON.parse(await readFile(new URL('../content/retailer-prices.json', import.meta.url), 'utf8')));
  const references = retailerMarketReferences(data, Date.parse(data.updatedAt));
  const html = renderToStaticMarkup(createElement(RetailerMarketOverview, { references }));
  for (const text of ['NT$ 7,433', '混合機況刊登價參考', '2 筆未確認稅別', '1 筆庫存待確認', 'NT$ 9,000', '副廠認證電池健康度 90%', '單店刊登', '稅別未明']) assert.ok(html.includes(text), text);
  for (const row of data.quotes) assert.ok(html.includes(row.url.replaceAll('&', '&amp;')), row.url);
  assert.ok(!html.includes('手機王'));
  assert.ok(!html.includes('waiting'));
  const result = compareRetailerPrices({ brand: 'Apple', model: 'iPhone 13', storage: '128GB', condition: '輕微使用痕跡' }, data, Date.parse(data.updatedAt));
  const summary = renderToStaticMarkup(createElement(RetailerPriceSummary, { result }));
  assert.ok(summary.includes('部分稅別未明'));
  assert.ok(summary.includes('部分庫存待確認'));
  const detail = renderToStaticMarkup(createElement(Comparison, { result }));
  assert.ok(detail.includes('樣本不足 3 家'));
  assert.ok(detail.includes('NT$ 7,433'));
  assert.ok(detail.includes('混合機況刊登價參考'));
  const filtered = renderToStaticMarkup(createElement(RetailerMarketOverview, { references, query: 'iPhone 13' }));
  assert.ok(!filtered.includes('iPhone 14'));
  const absent = renderToStaticMarkup(createElement(RetailerMarketOverview, { references, brand: 'Samsung' }));
  assert.ok(absent.includes('暫不提供均價'));
  assert.ok(!absent.includes('NT$'));
});
