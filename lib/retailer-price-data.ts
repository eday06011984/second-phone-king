import data from '@/content/retailer-prices.json';
import { compareRetailerPrices, retailerMarketReferences, validateRetailerDataset, type PhoneComparisonKey } from './retailer-prices';

const dataset = validateRetailerDataset(data);
export function retailerComparison(phone: PhoneComparisonKey, now = Date.now()) {
  return compareRetailerPrices(phone, dataset, now);
}
export function withRetailerComparisons<T extends PhoneComparisonKey>(rows: T[]) {
  const now = Date.now();
  return rows.map(row => ({ ...row, retailerComparison: retailerComparison(row, now) }));
}
export function retailerMarketOverview(now = Date.now()) {
  return retailerMarketReferences(dataset, now);
}
export const retailerDataPending = dataset.quotes.length === 0;
