import {readFileSync} from 'node:fs';
import {summarizeDays} from '../lib/traffic/policy.mjs';
const [file,start,end] = process.argv.slice(2);
if (!file || !start || !end) throw Error('Usage: node scripts/report-traffic.mjs PRIVATE_ROWS_JSON START END');
const input=JSON.parse(readFileSync(file,'utf8'));
const rows=Array.isArray(input)&&input[0]?.results ? input[0].results : input;
if (!Array.isArray(rows)) throw Error('Expected a rows array or Wrangler D1 export');
console.log(JSON.stringify(summarizeDays(rows,start,end),null,2));
