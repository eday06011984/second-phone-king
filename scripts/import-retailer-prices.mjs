import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadRetailerPriceModule } from './load-retailer-price-module.mjs';

const [input, mode = '--check'] = process.argv.slice(2);
if (!input || !['--check', '--write'].includes(mode) || process.argv.length > 4) {
  console.error('Usage: node scripts/import-retailer-prices.mjs <retailer-quotes.json> [--check|--write]');
  process.exit(1);
}
try {
  const { validateRetailerDataset } = await loadRetailerPriceModule();
  const data = validateRetailerDataset(JSON.parse(await readFile(resolve(input), 'utf8')));
  if (data.updatedAt && Date.parse(data.updatedAt) > Date.now()) throw new Error('Dataset update time cannot be in the future.');
  const future = data.quotes.some(quote => Date.parse(quote.observedAt) > Date.now());
  if (future) throw new Error('Quote observation time cannot be in the future.');
  if (mode === '--write') {
    const target = new URL('../content/retailer-prices.json', import.meta.url);
    const temporary = new URL('../content/.retailer-prices-import.tmp', import.meta.url);
    await writeFile(temporary, JSON.stringify(data, null, 2) + '\n');
    await rename(temporary, target);
  }
  console.log(`${mode === '--write' ? 'Imported locally' : 'Validated'}: ${data.quotes.length} quotes from ${data.sources.length} sources. No publishing performed.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Retailer price import failed.');
  process.exitCode = 1;
}
