import {decodeProtectedHeader, importX509, jwtVerify, type JWTVerifyGetKey} from 'jose';
import {firebaseConfig} from './firebase-config';

const certificatesURL='https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
let cache:{expires:number; certificates:Record<string,string>}|undefined;
let pending:Promise<void>|undefined;
async function refreshCertificates(){
  const response=await fetch(certificatesURL,{signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Identity verification unavailable');
  const certificates=await response.json() as Record<string,string>;
  if(!certificates||typeof certificates!=='object'||Object.values(certificates).some(v=>typeof v!=='string'))throw Error('Invalid signing keys');
  const seconds=Number(response.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1]||300);
  cache={expires:Date.now()+Math.min(seconds,21600)*1000,certificates};
}
const googleKey:JWTVerifyGetKey=async header=>{
  if(!cache||cache.expires<=Date.now()){
    pending??=refreshCertificates().finally(()=>{pending=undefined});
    await pending;
  }
  const cert=cache?.certificates[header.kid||''];
  if(!cert)throw Error('Unknown signing key');
  return importX509(cert,'RS256');
};

export async function verifyFirebaseToken(token:string,key:JWTVerifyGetKey=googleKey){
  if(typeof token!=='string'||token.length>3800)throw Error('Invalid token');
  const header=decodeProtectedHeader(token);
  if(header.alg!=='RS256'||!header.kid)throw Error('Invalid signing algorithm');
  const {payload}=await jwtVerify(token,key,{
    algorithms:['RS256'],audience:firebaseConfig.projectId,
    issuer:`https://securetoken.google.com/${firebaseConfig.projectId}`,
    requiredClaims:['sub','exp','iat','auth_time'],maxTokenAge:'1h',
  });
  const now=Math.floor(Date.now()/1000);
  const firebase=payload.firebase as {sign_in_provider?:string;tenant?:string}|undefined;
  if(!payload.sub||payload.sub.length>128||typeof payload.iat!=='number'||payload.iat>now||typeof payload.auth_time!=='number'||payload.auth_time>now||payload.auth_time<0||typeof payload.exp!=='number'||payload.exp<=now||payload.exp-payload.iat>3600||payload.email_verified!==true||typeof payload.email!=='string'||firebase?.sign_in_provider!=='google.com'||firebase.tenant)throw Error('Invalid identity claims');
  return {uid:payload.sub,email:payload.email,expires:payload.exp,authTime:payload.auth_time};
}
