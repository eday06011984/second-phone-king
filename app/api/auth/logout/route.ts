import {validAuthOrigin,sessionCookieHeader} from '@/lib/auth-policy';
export async function POST(req:Request){
  if(!validAuthOrigin(req))return new Response(null,{status:403});
  return Response.json({ok:true},{headers:{'Cache-Control':'private, no-store','Set-Cookie':sessionCookieHeader('',0)}});
}
