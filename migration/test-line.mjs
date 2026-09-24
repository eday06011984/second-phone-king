import assert from 'node:assert/strict';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
const out='.sites-runtime/line-tests';await mkdir(out,{recursive:true});
const sql=new DatabaseSync(':memory:');sql.exec(await readFile('migration/line-auth.sql','utf8'));
globalThis.testUser=null;globalThis.lineSub='U'+'a'.repeat(32);globalThis.exchangeCalls=0;
globalThis.testDB={prepare(q){let args=[];return {bind(...v){args=v;return this;},async first(){return sql.prepare(q).get(...args)||null;},async run(){return sql.prepare(q).run(...args);}};},async batch(stmts){sql.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}};
await writeFile(out+'/mock.mjs',`export const db=()=>globalThis.testDB;export const getUser=async()=>globalThis.testUser;export const lineSecret=()=> 'test-secret';export const exchangeLine=async()=>{globalThis.exchangeCalls++;return globalThis.lineSub;};`);
for(const [name,path] of Object.entries({policy:'lib/line-policy.ts',authpolicy:'lib/auth-policy.ts',start:'app/api/auth/line/start/route.ts',callback:'app/api/auth/line/callback/route.ts',logout:'app/api/auth/logout/route.ts'})){
 let s=await readFile(path,'utf8');for(const mod of ['auth','market','line-auth'])s=s.replaceAll(`@/lib/${mod}'`,`./mock.mjs'`);
 s=s.replaceAll('@/lib/line-policy','./policy.mjs').replaceAll('@/lib/auth-policy','./authpolicy.mjs');
 await writeFile(`${out}/${name}.mjs`,ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
}
const p=await import('../'+out+'/policy.mjs'),start=(await import('../'+out+'/start.mjs')).POST,callback=(await import('../'+out+'/callback.mjs')).GET,logout=(await import('../'+out+'/logout.mjs')).POST;
const origin=p.lineOrigin;
const post=(path,headers={origin})=>new Request(origin+path,{method:'POST',headers});
async function flow(mode=''){
 const r=await start(post('/api/auth/line/start'+mode));assert.equal(r.status,303);
 const u=new URL(r.headers.get('location'));assert.equal(u.origin,'https://access.line.me');assert.equal(u.searchParams.get('redirect_uri'),p.lineCallback);
 const cookie=r.headers.getSetCookie()[0].split(';')[0];return {u,cookie,request:(override={})=>new Request(p.lineCallback+'?'+new URLSearchParams({state:u.searchParams.get('state'),code:'code',...override}),{headers:{cookie}})};
}
assert.equal((await start(post('/api/auth/line/start',{origin:'https://evil.test'}))).status,403);
assert.equal((await start(post('/api/auth/line/start?mode=link'))).status,403);
const f=await flow();
const a=sql.prepare('SELECT * FROM line_oauth_attempts').get();assert.equal(await p.challenge(a.verifier),f.u.searchParams.get('code_challenge'));
assert.match((await callback(new Request(p.lineCallback+'?state='+a.state+'&code=bad',{headers:{cookie:p.flowCookie+'='+p.randomToken()}}))).headers.get('location'),/failed$/);
assert.equal(globalThis.exchangeCalls,0);
const ok=await callback(f.request());assert.match(ok.headers.get('location'),/success$/);assert.equal(sql.prepare('SELECT count(*) n FROM line_sessions').get().n,1);
assert.equal(sql.prepare('SELECT owner FROM line_identities').get().owner,'line:'+globalThis.lineSub);
assert.match((await callback(f.request())).headers.get('location'),/failed$/);assert.equal(globalThis.exchangeCalls,1);
const sessCookie=ok.headers.getSetCookie().find(s=>s.startsWith(p.lineCookie+'=')).split(';')[0];
assert.equal((await logout(post('/api/auth/logout',{origin,cookie:sessCookie}))).status,200);assert.equal(sql.prepare('SELECT count(*) n FROM line_sessions').get().n,0);
const cancelled=await flow();assert.match((await callback(cancelled.request({error:'access_denied'}))).headers.get('location'),/cancelled$/);
const expired=await flow();sql.prepare('UPDATE line_oauth_attempts SET expires=0').run();assert.match((await callback(expired.request())).headers.get('location'),/failed$/);
globalThis.testUser={firebaseUid:'google-user',userId:'legacy-store-owner'};
const conflict=await flow('?mode=link');assert.match((await callback(conflict.request())).headers.get('location'),/conflict$/);assert.equal(sql.prepare('SELECT owner FROM line_identities').get().owner,'line:'+globalThis.lineSub);
globalThis.lineSub='U'+'b'.repeat(32);const linked=await flow('?mode=link');assert.match((await callback(linked.request())).headers.get('location'),/linked$/);
assert.equal(sql.prepare('SELECT owner FROM line_identities WHERE subject=?').get(globalThis.lineSub).owner,'firebase:google-user');
const changed=await flow('?mode=link');globalThis.testUser={firebaseUid:'other-user'};assert.match((await callback(changed.request())).headers.get('location'),/failed$/);
globalThis.testUser=null;const reuse=await flow();assert.match((await callback(reuse.request())).headers.get('location'),/success$/);
const now=p.nowSeconds(),claims={iss:'https://access.line.me',aud:p.lineChannelId,sub:globalThis.lineSub,nonce:'n',iat:now,exp:now+3600};assert.equal(p.validateLineClaims(claims,'n'),globalThis.lineSub);
for(const change of [{iss:'evil'},{aud:'other'},{nonce:'bad'},{exp:now-1},{iat:now-700},{iat:now+90},{sub:''}])assert.throws(()=>p.validateLineClaims({...claims,...change},'n'));
console.log('PASS LINE: origin rejection, PKCE, browser/state binding, single-use callback, expiry/cancellation, session/logout, linked login, conflicting accounts, changed Google identity, invalid OIDC claims. External LINE calls mocked; live acceptance still required.');
