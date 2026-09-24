import {getUser} from '@/lib/auth';
import {sessionCookieHeader} from '@/lib/auth-policy';
import {db} from '@/lib/market';
import {exchangeLine} from '@/lib/line-auth';
import {lineOrigin,lineCallback,lineCookie,flowCookie,readCookie,randomToken,hashToken,cookieHeader,nowSeconds} from '@/lib/line-policy';
type Attempt={verifier:string;nonce:string;origin:string;link_owner:string|null};
export async function GET(req:Request){
 const headers=new Headers({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});
 headers.append('Set-Cookie',cookieHeader(flowCookie,'',0));
 const done=(result:string)=>{headers.set('Location',lineOrigin+'/seller?line='+result);return new Response(null,{status:303,headers});};
 try{
  const url=new URL(req.url),state=url.searchParams.get('state'),browser=readCookie(req,flowCookie);
  if(url.origin!==lineOrigin||!state||!/^[a-f0-9]{64}$/.test(state)||!/^[a-f0-9]{64}$/.test(browser))return done('failed');
  // Atomic consumption binds the callback to this browser and prevents reuse.
  const attempt=await db().prepare('DELETE FROM line_oauth_attempts WHERE state=? AND browser_hash=? AND expires>? RETURNING verifier,nonce,origin,link_owner').bind(state,await hashToken(browser),nowSeconds()).first<Attempt>();
  if(!attempt||attempt.origin!==lineOrigin)return done('failed');
  if(url.searchParams.has('error'))return done('cancelled');
  const code=url.searchParams.get('code');if(!code||code.length>2048)return done('failed');
  if(attempt.link_owner){const u=await getUser();if(!u?.firebaseUid||attempt.link_owner!=='firebase:'+u.firebaseUid)return done('failed');}
  const subject=await exchangeLine(code,attempt.verifier,attempt.nonce,lineCallback);
  const owner=attempt.link_owner||'line:'+subject;
  await db().prepare('INSERT INTO line_identities(subject,owner,created) VALUES(?,?,?) ON CONFLICT(subject) DO NOTHING').bind(subject,owner,nowSeconds()).run();
  const identity=await db().prepare('SELECT owner FROM line_identities WHERE subject=?').bind(subject).first<{owner:string}>();
  if(!identity)throw Error('No identity');
  // Never merge an existing LINE identity into another merchant implicitly.
  if(attempt.link_owner&&identity.owner!==attempt.link_owner)return done('conflict');
  if(attempt.link_owner)return done('linked');
  const token=randomToken();
  await db().prepare('INSERT INTO line_sessions(token_hash,subject,expires) VALUES(?,?,?)').bind(await hashToken(token),subject,nowSeconds()+3600).run();
  headers.append('Set-Cookie',sessionCookieHeader('',0));headers.append('Set-Cookie',cookieHeader(lineCookie,token,3600));return done('success');
 }catch{return done('failed');}
}
