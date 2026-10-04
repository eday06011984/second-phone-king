import { mkdir, readFile, writeFile } from 'node:fs/promises';
import ts from 'typescript';

// Match the existing test workflow and keep generated code outside source.
export async function loadRetailerPriceModule() {
  const directory = new URL('../.sites-runtime/retailer-prices/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const source = await readFile(new URL('../lib/retailer-prices.ts', import.meta.url), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  const filename = new URL('retailer-prices.mjs', directory);
  await writeFile(filename, output);
  return import(filename.href);
}
