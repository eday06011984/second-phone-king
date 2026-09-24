export const sessionCookie='__Host-spk_id_token';
const allowedOrigins=new Set(['https://xn--4kq449bj1fmzj.tw','https://second-phone-king.eday06011984.workers.dev']);
export function validAuthOrigin(req:Request){
  const origin=new URL(req.url).origin;
  return allowedOrigins.has(origin)&&req.headers.get('origin')===origin&&req.headers.get('sec-fetch-site')!=='cross-site';
}
export function sessionCookieHeader(value:string,seconds:number){
  return `${sessionCookie}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
}
