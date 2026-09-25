export const lineCookie='__Host-spk_line';
export const flowCookie='__Host-spk_line_flow';
export const lineChannelId='2011719857';
export const lineOrigin='https://xn--4kq449bj1fmzj.tw';
const lineOrigins=new Set([lineOrigin,'https://second-phone-king.eday06011984.workers.dev']);
export function getLineOrigin(req:Request){const origin=new URL(req.url).origin;return lineOrigins.has(origin)?origin:null;}
export const lineCallback=lineOrigin+'/api/auth/line/callback';
export const nowSeconds=()=>Math.floor(Date.now()/1000);
export function randomToken(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function hashToken(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function challenge(verifier:string){return btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
export function cookieHeader(name:string,value:string,age:number){return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;}
export function readCookie(req:Request,name:string){const raw=req.headers.get('cookie')||'';return raw.split(';').map(s=>s.trim()).find(s=>s.startsWith(name+'='))?.slice(name.length+1)||'';}
export function validateLineClaims(c:Record<string,unknown>,nonce:string,now=nowSeconds()){
 if(c.iss!=='https://access.line.me'||c.aud!==lineChannelId||c.nonce!==nonce||typeof c.sub!=='string'||!/^U[0-9a-f]{32}$/.test(c.sub)||typeof c.exp!=='number'||c.exp<=now||typeof c.iat!=='number'||c.iat>now+60||c.iat<now-600)throw Error('Invalid LINE claims');
 return c.sub;
}
