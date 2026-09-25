import {getUser} from '@/lib/auth';
import {validAuthOrigin} from '@/lib/auth-policy';
import {db} from '@/lib/market';
import {lineSecret} from '@/lib/line-auth';
import {getLineOrigin,lineChannelId,randomToken,hashToken,challenge,cookieHeader,flowCookie,nowSeconds} from '@/lib/line-policy';
export async function POST(req:Request){
 const headers=new Headers({'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'});
 const lineOrigin=getLineOrigin(req);
 if(!lineOrigin||!validAuthOrigin(req))return new Response('請從二手機王登入頁重新登入。',{status:403,headers});
 const lineCallback=lineOrigin+'/api/auth/line/callback';
 try{
  lineSecret();const mode=new URL(req.url).searchParams.get('mode');
  const u=await getUser();let owner:string|null=null;
  if(mode==='link'){
   if(!u?.firebaseUid)return new Response('請先使用 Google 登入，再綁定 LINE。',{status:403,headers});
   owner='firebase:'+u.firebaseUid;
  }else if(mode!==null)return new Response('不支援的操作。',{status:400,headers});
  const state=randomToken(),browser=randomToken(),verifier=randomToken(),nonce=randomToken(),now=nowSeconds();
  await db().batch([
   db().prepare('DELETE FROM line_oauth_attempts WHERE expires<=?').bind(now),
   db().prepare('DELETE FROM line_sessions WHERE expires<=?').bind(now),
   db().prepare('INSERT INTO line_oauth_attempts(state,browser_hash,verifier,nonce,origin,link_owner,expires) VALUES(?,?,?,?,?,?,?)').bind(state,await hashToken(browser),verifier,nonce,lineOrigin,owner,now+600)
  ]);
  const url=new URL('https://access.line.me/oauth2/v2.1/authorize');
  url.search=new URLSearchParams({response_type:'code',client_id:lineChannelId,redirect_uri:lineCallback,state,scope:'openid profile',nonce,code_challenge:await challenge(verifier),code_challenge_method:'S256',prompt:'consent'}).toString();
  headers.set('Location',url.toString());headers.append('Set-Cookie',cookieHeader(flowCookie,browser,600));return new Response(null,{status:303,headers});
 }catch{return new Response('LINE 登入尚未就緒，請確認密鑰與資料表已設定。',{status:503,headers});}
}
