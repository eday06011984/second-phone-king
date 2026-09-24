import {readFile, writeFile} from 'node:fs/promises';
const snapshot=JSON.parse(await readFile(new URL('./snapshot.local.json',import.meta.url),'utf8'));
const tables={stores:['id','owner','name','city','address','phone','line','created'],listings:['id','store_id','brand','model','storage','color','price','battery','condition','warranty','description','images','status','created','updated']};
const quote=v=>v===null?'NULL':typeof v==='number'&&Number.isFinite(v)?String(v):typeof v==='string'?"CAST(X'"+Buffer.from(v,'utf8').toString('hex')+"' AS TEXT)":(()=>{throw Error('Invalid cell')})();
const storeIds=new Set(snapshot.stores.map(r=>r.id));
const images=new Set();
for(const [table,columns] of Object.entries(tables)){
 const ids=new Set();
 for(const row of snapshot[table]){
  if(ids.has(row.id))throw Error('Duplicate record');ids.add(row.id);
  if(columns.some(c=>!(c in row)))throw Error('Missing column');
  if(table==='listings'){
   if(!storeIds.has(row.store_id))throw Error('Orphan listing');
   if(!['active','sold','hidden'].includes(row.status))throw Error('Invalid status');
   for(const id of JSON.parse(row.images)){if(!/^[0-9a-f-]{36}$/.test(id))throw Error('Invalid image key');images.add(id);}
  }
 }
}
let sql=await readFile(new URL('../drizzle/0000_outgoing_steel_serpent.sql',import.meta.url),'utf8');
// For a NEW EMPTY database only: deliberately fail on existing tables/data.
sql='-- Source snapshot: '+snapshot.capturedAt+'\nPRAGMA foreign_keys=ON;\n'+sql+'\n';
for(const [table,columns] of Object.entries(tables))for(const row of snapshot[table])sql+='INSERT INTO "'+table+'" ('+columns.map(c=>'"'+c+'"').join(',')+') VALUES ('+columns.map(c=>quote(row[c])).join(',')+');\n';
await writeFile(new URL('./import.local.sql',import.meta.url),sql,{mode:0o600});
await writeFile(new URL('./images.local.json',import.meta.url),JSON.stringify([...images],null,2),{mode:0o600});
console.log(JSON.stringify({stores:snapshot.stores.length,listings:snapshot.listings.length,imageKeys:images.size,photosDownloaded:false}));
