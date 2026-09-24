import {lineIdentity} from './line-auth';
import {lineCookie} from './line-policy';
import {cookies} from 'next/headers';
import {db} from './market';
import {verifyFirebaseToken} from './firebase-token';
import {sessionCookie} from './auth-policy';

export async function getUser(){
  const jar=await cookies();
  const lineToken=jar.get(lineCookie)?.value;
  if(lineToken){
    const identity=await lineIdentity(lineToken);
    if(identity){
      const uid=identity.owner.startsWith('firebase:')?identity.owner.slice(9):null;
      const mapping=uid?await db().prepare('SELECT legacy_owner FROM firebase_owner_links WHERE firebase_uid=?').bind(uid).first<{legacy_owner:string}>():null;
      return {userId:mapping?.legacy_owner||identity.owner,firebaseUid:null,email:''};
    }
  }
  const cookie=jar.get(sessionCookie)?.value;
  if(!cookie)return null;
  let identity;
  try{identity=await verifyFirebaseToken(cookie);}catch{return null;}
  // Only an administrator's verified migration may associate a legacy owner.
  // Never use email matching or trust oai-authenticated-user-* request headers.
  const mapping=await db().prepare('SELECT legacy_owner FROM firebase_owner_links WHERE firebase_uid=?').bind(identity.uid).first<{legacy_owner:string}>();
  return {userId:mapping?.legacy_owner||`firebase:${identity.uid}`,firebaseUid:identity.uid,email:identity.email};
}
