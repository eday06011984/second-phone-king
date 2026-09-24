import {verifyFirebaseToken} from '@/lib/firebase-token';
import {validAuthOrigin,sessionCookieHeader} from '@/lib/auth-policy';
export async function POST(req:Request){
  const headers={'Cache-Control':'private, no-store'};
  if(!validAuthOrigin(req))return Response.json({error:'請從本站重新登入。'},{status:403,headers});
  if(!req.headers.get('content-type')?.startsWith('application/json'))return Response.json({error:'格式不正確。'},{status:415,headers});
  try{
    const reader=req.body?.getReader();if(!reader)throw Error('No body');
    const chunks:Uint8Array[]=[];let size=0;
    while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>6000){await reader.cancel();return Response.json({error:'請求過大。'},{status:413,headers});}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const {idToken}=JSON.parse(new TextDecoder().decode(bytes));
    const identity=await verifyFirebaseToken(idToken);
    const now=Math.floor(Date.now()/1000);
    if(now-identity.authTime>300)throw Error('Fresh sign-in required');
    return Response.json({ok:true},{headers:{...headers,'Set-Cookie':sessionCookieHeader(idToken,Math.min(identity.expires-now,3600))}});
  }catch{return Response.json({error:'登入驗證失敗，請重新使用 Google 登入。'},{status:401,headers});}
}
