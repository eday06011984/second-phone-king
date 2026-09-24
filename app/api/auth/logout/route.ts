import {validAuthOrigin,sessionCookieHeader} from '@/lib/auth-policy';
import {lineCookie,flowCookie,cookieHeader,readCookie,hashToken} from '@/lib/line-policy';
import {db} from '@/lib/market';
export async function POST(req:Request){
 if(!validAuthOrigin(req))return new Response(null,{status:403});
 const token=readCookie(req,lineCookie);
 if(token){try{await db().prepare('DELETE FROM line_sessions WHERE token_hash=?').bind(await hashToken(token)).run();}catch{return Response.json({error:'登出失敗，請重試。'},{status:503});}}
 const headers=new Headers({'Cache-Control':'private, no-store'});
 headers.append('Set-Cookie',sessionCookieHeader('',0));
 headers.append('Set-Cookie',cookieHeader(lineCookie,'',0));
 headers.append('Set-Cookie',cookieHeader(flowCookie,'',0));
 return Response.json({ok:true},{headers});
}
