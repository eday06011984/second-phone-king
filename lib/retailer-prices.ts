/** Retailer asking prices, separated into like-condition comparisons and mixed-condition references. */
export const MIN_RETAILER_STORES = 3;
export const MAX_QUOTE_AGE_DAYS = 7;
export const usedConditions = ['近全新', '輕微使用痕跡', '明顯使用痕跡', '有瑕疵，詳見說明'] as const;
export type UsedCondition = typeof usedConditions[number];
export type PhoneModelKey = { brand: string; model: string; storage: string };
export type PhoneComparisonKey = PhoneModelKey & { condition: string };
export type RetailerSource = {
  id: string; name: string; url: string; method: 'manual-public-page' | 'authorized-feed'; reference: string;
};
export type RetailerQuote = PhoneComparisonKey & {
  // Stable merchant / inventory IDs must be shared across syndicated sources.
  storeKey: string; listingKey: string; storeName: string; sourceId: string; url: string;
  price: number; priceType: 'fixed' | 'from'; currency: 'TWD'; taxIncluded: boolean | null;
  kind: 'used-retail' | 'refurbished-retail' | 'new-retail' | 'buyback' | 'contract';
  availability: 'in-stock' | 'sold' | 'unknown'; observedAt: string;
  sourceCondition: string; conditionVerified: boolean; notes: string;
};
export type RetailerDataset = { version: 2; updatedAt: string | null; sources: RetailerSource[]; quotes: RetailerQuote[] };
export type PriceSampleSummary = {
  status: 'available' | 'pending-data' | 'unknown-condition' | 'insufficient-samples';
  storeCount: number; listingCount: number; average: number | null; minimum: number | null; maximum: number | null;
  oldestObservedAt: string | null; newestObservedAt: string | null;
  quotes: (RetailerQuote & { sourceName: string })[];
};
export type RetailerMarketReference = PriceSampleSummary & PhoneModelKey & {
  basis: 'mixed-condition-asking'; unknownTaxCount: number; unknownAvailabilityCount: number;
};
export type RetailerComparison = PriceSampleSummary & { marketReference: RetailerMarketReference };
const day = 86_400_000;
const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isIdentity = (value: unknown): value is string => typeof value === 'string' && /^[a-z0-9][a-z0-9._:-]{0,199}$/.test(value);
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function isSafeQuoteUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}
const isTimestamp = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-](\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;
  const [, year, month, date, hour, minute, second, , offsetHour = '0', offsetMinute = '0'] = match;
  const leap = +year % 4 === 0 && (+year % 100 !== 0 || +year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 31, 30, 31];
  return +month >= 1 && +month <= 12 && +date >= 1 && +date <= days[+month - 1] && +hour <= 23 && +minute <= 59 && +second <= 59 && +offsetHour <= 14 && +offsetMinute <= 59 && (+offsetHour !== 14 || +offsetMinute === 0) && Number.isFinite(Date.parse(value));
};

/** Reject malformed imports rather than silently publishing partial or invented prices. */
export function validateRetailerDataset(input: unknown): RetailerDataset {
  if (!isRecord(input) || input.version !== 2 || !Array.isArray(input.sources) || !Array.isArray(input.quotes) || (input.updatedAt !== null && !isTimestamp(input.updatedAt))) throw new Error('Invalid retailer price dataset.');
  const ids = new Set<string>();
  for (const source of input.sources) {
    if (!isRecord(source) || !isIdentity(source.id) || !nonempty(source.name) || !isSafeQuoteUrl(source.url) || !['manual-public-page', 'authorized-feed'].includes(String(source.method)) || !nonempty(source.reference) || ids.has(source.id)) throw new Error('Invalid or duplicate price source; a collection method and source reference are required.');
    ids.add(source.id);
  }
  for (const quote of input.quotes) {
    if (!isRecord(quote) || !isIdentity(quote.storeKey) || !isIdentity(quote.listingKey) || !['brand', 'model', 'storage', 'condition', 'storeKey', 'listingKey', 'storeName', 'sourceId', 'sourceCondition'].every(key => nonempty(quote[key])) || !isSafeQuoteUrl(quote.url) || !isTimestamp(quote.observedAt) || typeof quote.price !== 'number' || !Number.isSafeInteger(quote.price) || quote.price <= 0 || quote.price > 500000 || !['fixed', 'from'].includes(String(quote.priceType)) || quote.currency !== 'TWD' || ![true, false, null].includes(quote.taxIncluded as boolean | null) || !['used-retail', 'refurbished-retail', 'new-retail', 'buyback', 'contract'].includes(String(quote.kind)) || !['in-stock', 'sold', 'unknown'].includes(String(quote.availability)) || typeof quote.conditionVerified !== 'boolean' || typeof quote.notes !== 'string' || !ids.has(String(quote.sourceId))) throw new Error('Invalid retailer quote. Check identity, source, price, condition and observation time.');
    if (input.updatedAt === null || Date.parse(quote.observedAt) > Date.parse(input.updatedAt as string)) throw new Error('Dataset update time must include every quote observation.');
  }
  return input as RetailerDataset;
}

// Normalize typography only. Never infer Pro/Max, capacity, or source grade equivalence.
const normalize = (value: string) => value.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, '');
function sameModel(a: PhoneModelKey, b: PhoneModelKey) {
  return ['brand', 'model', 'storage'].every(key => normalize(a[key as keyof PhoneModelKey]) === normalize(b[key as keyof PhoneModelKey]));
}
const empty = (): PriceSampleSummary => ({ status: 'insufficient-samples', storeCount: 0, listingCount: 0, average: null, minimum: null, maximum: null, oldestObservedAt: null, newestObservedAt: null, quotes: [] });

function currentQuotes(dataset: RetailerDataset, now: number) {
  const sources = new Map(dataset.sources.filter(source => isIdentity(source.id) && ['manual-public-page', 'authorized-feed'].includes(source.method) && source.reference.trim()).map(source => [source.id, source]));
  // Latest observation precedes all eligibility filters: a sold / changed record invalidates the old price.
  const latest = new Map<string, RetailerQuote>();
  const conflicted = new Set<string>();
  const comparableFields: (keyof RetailerQuote)[] = ['brand', 'model', 'storage', 'condition', 'conditionVerified', 'sourceCondition', 'price', 'priceType', 'currency', 'taxIncluded', 'kind', 'availability'];
  for (const quote of dataset.quotes) {
    if (!isIdentity(quote.storeKey) || !isIdentity(quote.listingKey) || !sources.has(quote.sourceId) || !isTimestamp(quote.observedAt)) continue;
    const key = `${quote.storeKey}\u0000${quote.listingKey}`;
    const previous = latest.get(key);
    if (!previous || Date.parse(quote.observedAt) > Date.parse(previous.observedAt)) {
      latest.set(key, quote);
      conflicted.delete(key);
    } else if (Date.parse(quote.observedAt) === Date.parse(previous.observedAt) && comparableFields.some(field => quote[field] !== previous[field])) {
      conflicted.add(key);
    }
  }
  return [...latest.entries()].filter(([key]) => !conflicted.has(key)).map(([, quote]) => quote).filter(quote => {
    const age = now - Date.parse(quote.observedAt);
    return quote.kind === 'used-retail' && quote.priceType === 'fixed' && quote.currency === 'TWD' && [true, null].includes(quote.taxIncluded) && ['in-stock', 'unknown'].includes(quote.availability) && age >= 0 && age <= MAX_QUOTE_AGE_DAYS * day && isSafeQuoteUrl(quote.url) && Number.isSafeInteger(quote.price) && quote.price > 0 && quote.price <= 500000;
  }).map(quote => ({ ...quote, sourceName: sources.get(quote.sourceId)!.name })).sort((a, b) => a.price - b.price || a.storeKey.localeCompare(b.storeKey));
}
function summarize(quotes: PriceSampleSummary['quotes']): PriceSampleSummary {
  const stores = new Map<string, number[]>();
  for (const quote of quotes) stores.set(quote.storeKey, [...(stores.get(quote.storeKey) ?? []), quote.price]);
  const observed = quotes.map(quote => quote.observedAt).sort((a, b) => Date.parse(a) - Date.parse(b));
  const result = { ...empty(), storeCount: stores.size, listingCount: quotes.length, oldestObservedAt: observed[0] ?? null, newestObservedAt: observed.at(-1) ?? null, quotes };
  if (stores.size < MIN_RETAILER_STORES) return result;
  // Each merchant gets equal weight, even when one has many listings.
  const storeMeans = [...stores.values()].map(prices => prices.reduce((sum, price) => sum + price, 0) / prices.length);
  return { ...result, status: 'available', average: Math.round(storeMeans.reduce((sum, price) => sum + price, 0) / storeMeans.length), minimum: Math.min(...quotes.map(quote => quote.price)), maximum: Math.max(...quotes.map(quote => quote.price)) };
}
export function retailerMarketReference(phone: PhoneModelKey, dataset: RetailerDataset, now = Date.now()): RetailerMarketReference {
  const quotes = currentQuotes(dataset, now).filter(quote => sameModel(phone, quote));
  return { brand: phone.brand, model: phone.model, storage: phone.storage, ...summarize(quotes), ...(!dataset.quotes.length ? { status: 'pending-data' as const } : {}), basis: 'mixed-condition-asking', unknownTaxCount: quotes.filter(quote => quote.taxIncluded === null).length, unknownAvailabilityCount: quotes.filter(quote => quote.availability === 'unknown').length };
}
export function retailerMarketReferences(dataset: RetailerDataset, now = Date.now()): RetailerMarketReference[] {
  const models = new Map<string, PhoneModelKey>();
  for (const quote of currentQuotes(dataset, now)) {
    const { brand, model, storage } = quote;
    models.set([brand, model, storage].map(normalize).join('\u0000'), { brand, model, storage });
  }
  return [...models.values()].map(phone => retailerMarketReference(phone, dataset, now)).sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model, 'en', { numeric: true }) || a.storage.localeCompare(b.storage, 'en', { numeric: true }));
}
export function compareRetailerPrices(phone: PhoneComparisonKey, dataset: RetailerDataset, now = Date.now()): RetailerComparison {
  const marketReference = retailerMarketReference(phone, dataset, now);
  if (!usedConditions.includes(phone.condition as UsedCondition)) return { ...empty(), status: 'unknown-condition', marketReference };
  if (!dataset.quotes.length) return { ...empty(), status: 'pending-data', marketReference };
  const quotes = currentQuotes(dataset, now).filter(quote => sameModel(phone, quote) && normalize(phone.condition) === normalize(quote.condition) && quote.conditionVerified && quote.taxIncluded === true && quote.availability === 'in-stock');
  return { ...summarize(quotes), marketReference };
}
