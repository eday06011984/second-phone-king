import {NextRequest,NextResponse} from 'next/server';
export function middleware(request:NextRequest){
  const response=NextResponse.next();
  if(request.nextUrl.hostname!=='xn--4kq449bj1fmzj.tw')response.headers.set('X-Robots-Tag','noindex, nofollow');
  if(request.nextUrl.pathname.startsWith('/seller')||request.nextUrl.pathname.startsWith('/api/auth')||request.nextUrl.pathname.startsWith('/api/manage'))response.headers.set('Cache-Control','private, no-store');
  return response;
}
