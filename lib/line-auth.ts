import {env} from 'cloudflare:workers';
import {db} from './market';
import {hashToken,nowSeconds,lineChannelId,validateLineClaims} from './line-policy';
export function lineSecret(){const secret=env.LINE_CHANNEL_SECRET;if(!secret)throw Error('LINE not configured');return secret;}
export async function lineIdentity(token:string){
 if(!/^[a-f0-9]{64}$/.test(token))return null;
 return db().prepare('SELECT i.owner FROM line_sessions s JOIN line_identities i ON i.subject=s.subject WHERE s.token_hash=? AND s.expires>?').bind(await hashToken(token),nowSeconds()).first<{owner:string}>();
}
export async function linePost(path:string,params:Record<string,string>){
 const r=await fetch('https://api.line.me/oauth2/v2.1/'+path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params),signal:AbortSignal.timeout(10000)});
 if(!r.ok)throw Error('LINE verification failed');return r.json() as Promise<Record<string,unknown>>;
}
export async function exchangeLine(code:string,verifier:string,nonce:string,redirectUri:string){
 const tokens=await linePost('token',{grant_type:'authorization_code',code,redirect_uri:redirectUri,client_id:lineChannelId,client_secret:lineSecret(),code_verifier:verifier});
 if(typeof tokens.id_token!=='string')throw Error('Missing ID token');
 const claims=await linePost('verify',{id_token:tokens.id_token,client_id:lineChannelId,nonce});
 return validateLineClaims(claims,nonce);
}
