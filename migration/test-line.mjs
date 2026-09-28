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
// Exercise real session resolution too; only runtime boundaries are mocked.
await writeFile(out+'/session-mock.mjs',`export const db=()=>globalThis.testDB;
export const env={};
export const cookies=async()=>({get:name=>globalThis.testCookies.get(name)});
export const verifyFirebaseToken=async()=>{throw Error('LINE-only login must not verify a Firebase token');};`);
for(const [name,path] of Object.entries({identity:'lib/line-auth.ts',user:'lib/auth.ts'})){
 let source=await readFile(path,'utf8');
 for(const mod of ['cloudflare:workers','next/headers','./market','./firebase-token'])source=source.replaceAll(`'${mod}'`,"'./session-mock.mjs'");
 source=source.replaceAll("'./line-auth'","'./identity.mjs'").replaceAll("'./line-policy'","'./policy.mjs'").replaceAll("'./auth-policy'","'./authpolicy.mjs'");
 await writeFile(`${out}/${name}.mjs`,ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText);
}
const {getUser:resolveUser}=await import('../'+out+'/user.mjs');
const {sessionCookie}=await import('../'+out+'/authpolicy.mjs');
async function assertLineSession(response,owner){
 const cookie=response.headers.getSetCookie().find(s=>s.startsWith(p.lineCookie+'='));
 assert.ok(cookie,'successful LINE login issues its own session');
 const token=cookie.split(';')[0].slice(p.lineCookie.length+1);
 globalThis.testCookies=new Map([[p.lineCookie,{value:token}]]);
 assert.deepEqual(await resolveUser(),{userId:owner,firebaseUid:null,email:''});
 assert.ok(response.headers.getSetCookie().some(s=>s.startsWith(sessionCookie+'=;')&&s.includes('Max-Age=0')),'LINE login clears the Google session');
}
const origin=process.env.LINE_TEST_ORIGIN||p.lineOrigin;
const callbackURL=origin+'/api/auth/line/callback';
const post=(path,headers={origin})=>new Request(origin+path,{method:'POST',headers});
async function flow(mode=''){
 const r=await start(post('/api/auth/line/start'+mode));assert.equal(r.status,303);
 const u=new URL(r.headers.get('location'));assert.equal(u.origin,'https://access.line.me');assert.equal(u.searchParams.get('redirect_uri'),callbackURL);
 const cookie=r.headers.getSetCookie()[0].split(';')[0];return {u,cookie,request:(override={})=>new Request(callbackURL+'?'+new URLSearchParams({state:u.searchParams.get('state'),code:'code',...override}),{headers:{cookie}})};
}
assert.equal((await start(post('/api/auth/line/start',{origin:'https://evil.test'}))).status,403);
assert.equal((await start(post('/api/auth/line/start?mode=link'))).status,403);
const f=await flow();
const a=sql.prepare('SELECT * FROM line_oauth_attempts').get();assert.equal(a.link_owner,null,'LINE-only login does not require Google');assert.equal(await p.challenge(a.verifier),f.u.searchParams.get('code_challenge'));
assert.match((await callback(new Request(callbackURL+'?state='+a.state+'&code=bad',{headers:{cookie:p.flowCookie+'='+p.randomToken()}}))).headers.get('location'),/failed$/);
assert.equal(globalThis.exchangeCalls,0);
const ok=await callback(f.request());assert.match(ok.headers.get('location'),/success$/);assert.equal(sql.prepare('SELECT count(*) n FROM line_sessions').get().n,1);
assert.equal(sql.prepare('SELECT owner FROM line_identities').get().owner,'line:'+globalThis.lineSub);
assert.match((await callback(f.request())).headers.get('location'),/failed$/);assert.equal(globalThis.exchangeCalls,1);
await assertLineSession(ok,'line:'+globalThis.lineSub);
const sessCookie=ok.headers.getSetCookie().find(s=>s.startsWith(p.lineCookie+'=')).split(';')[0];
assert.equal((await logout(post('/api/auth/logout',{origin,cookie:sessCookie}))).status,200);assert.equal(sql.prepare('SELECT count(*) n FROM line_sessions').get().n,0);
const cancelled=await flow();assert.match((await callback(cancelled.request({error:'access_denied'}))).headers.get('location'),/cancelled$/);
const expired=await flow();sql.prepare('UPDATE line_oauth_attempts SET expires=0').run();assert.match((await callback(expired.request())).headers.get('location'),/failed$/);
globalThis.testUser={firebaseUid:'google-user',userId:'legacy-store-owner'};
// Even with Google signed in, ordinary LINE login must stay independent.
const independent=await flow();
assert.equal(sql.prepare('SELECT link_owner FROM line_oauth_attempts WHERE state=?').get(independent.u.searchParams.get('state')).link_owner,null);
const independentResult=await callback(independent.request());
assert.match(independentResult.headers.get('location'),/success$/);
await assertLineSession(independentResult,'line:'+globalThis.lineSub);
const originalSub=globalThis.lineSub;
globalThis.lineSub='U'+'c'.repeat(32);
const freshIndependent=await flow();
const freshResult=await callback(freshIndependent.request());
assert.match(freshResult.headers.get('location'),/success$/);
assert.equal(sql.prepare('SELECT owner FROM line_identities WHERE subject=?').get(globalThis.lineSub).owner,'line:'+globalThis.lineSub,'new LINE identity must not inherit the active Google owner');
await assertLineSession(freshResult,'line:'+globalThis.lineSub);
globalThis.lineSub=originalSub;
const snapshot=()=>({identities:sql.prepare('SELECT * FROM line_identities ORDER BY subject').all(),sessions:sql.prepare('SELECT * FROM line_sessions ORDER BY token_hash').all()});
async function assertConflict(){
 const before=snapshot();
 const attempt=await flow('?mode=link');
 const response=await callback(attempt.request());
 assert.match(response.headers.get('location'),/conflict$/);
 assert.deepEqual(snapshot(),before,'conflict must not merge/reassign identities or alter sessions');
 assert.equal(response.headers.getSetCookie().some(s=>s.startsWith(p.lineCookie+'=')||s.startsWith(sessionCookie+'=')),false,'conflict must not switch authenticated sessions');
}
await assertConflict();
const conflict=await flow('?mode=link');assert.match((await callback(conflict.request())).headers.get('location'),/conflict$/);assert.equal(sql.prepare('SELECT owner FROM line_identities').get().owner,'line:'+globalThis.lineSub);
globalThis.lineSub='U'+'b'.repeat(32);const linked=await flow('?mode=link');assert.match((await callback(linked.request())).headers.get('location'),/linked$/);
assert.equal(sql.prepare('SELECT owner FROM line_identities WHERE subject=?').get(globalThis.lineSub).owner,'firebase:google-user');
globalThis.testUser={firebaseUid:'other-user'};
await assertConflict(); // LINE already linked to a different Google account.
globalThis.testUser={firebaseUid:'google-user',userId:'legacy-store-owner'};
const changed=await flow('?mode=link');globalThis.testUser={firebaseUid:'other-user'};assert.match((await callback(changed.request())).headers.get('location'),/failed$/);
globalThis.testUser=null;const reuse=await flow();assert.match((await callback(reuse.request())).headers.get('location'),/success$/);
const now=p.nowSeconds(),claims={iss:'https://access.line.me',aud:p.lineChannelId,sub:globalThis.lineSub,nonce:'n',iat:now,exp:now+3600};assert.equal(p.validateLineClaims(claims,'n'),globalThis.lineSub);
for(const change of [{iss:'evil'},{aud:'other'},{nonce:'bad'},{exp:now-1},{iat:now-700},{iat:now+90},{sub:''}])assert.throws(()=>p.validateLineClaims({...claims,...change},'n'));
const otherOrigin=origin===p.lineOrigin?'https://second-phone-king.eday06011984.workers.dev':p.lineOrigin;
const cross=await flow();
const crossed=new URL(cross.request().url);crossed.host=new URL(otherOrigin).host;
const calls=globalThis.exchangeCalls;
assert.match((await callback(new Request(crossed,{headers:{cookie:cross.cookie}}))).headers.get('location'),/failed$/);
assert.equal(globalThis.exchangeCalls,calls);
assert.match((await callback(cross.request())).headers.get('location'),/success$/);
assert.equal((await start(new Request('https://evil.test/api/auth/line/start',{method:'POST',headers:{origin:'https://evil.test'}}))).status,403);
assert.equal((await callback(new Request('https://evil.test/api/auth/line/callback'))).status,403);
console.log('Tested origin:',origin);
console.log('PASS LINE: LINE-only session resolution, no implicit Google linking (new/existing LINE), conflict preserves identities/sessions (LINE/Google owners), origin rejection, PKCE, browser/state binding, single-use callback, expiry/cancellation, session/logout, linked login, conflicting accounts, changed Google identity, invalid OIDC claims. External LINE calls mocked; live acceptance still required.');
