'use client';
import {useState} from 'react';
import {getApp,getApps,initializeApp} from 'firebase/app';
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,setPersistence,inMemoryPersistence} from 'firebase/auth';
import {firebaseConfig} from '@/lib/firebase-config';

export default function GoogleLogin(){
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function login(){
    setBusy(true);setError('');
    const auth=getAuth(getApps().length?getApp():initializeApp(firebaseConfig));
    auth.languageCode='zh-TW';
    try{
      await setPersistence(auth,inMemoryPersistence);
      const provider=new GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
      const result=await signInWithPopup(auth,provider);
      const response=await fetch('/api/auth/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:await result.user.getIdToken(true)})});
      const data=await response.json() as {error?:string};
      if(!response.ok)throw Error(data.error||'登入驗證失敗，請稍後再試。');
      await signOut(auth);window.location.assign('/seller');
    }catch(e){
      await signOut(auth).catch(()=>{});
      const code=(e as {code?:string}).code;
      setError(code==='auth/popup-blocked'?'瀏覽器阻擋登入視窗，請允許彈出視窗後再試。':code==='auth/popup-closed-by-user'?'登入視窗已關閉，你可以重新登入。':code==='auth/unauthorized-domain'?'此網址尚未完成登入設定，請稍後再試。':code?'Google 登入暫時無法使用，請稍後再試。':e instanceof Error?e.message:'登入失敗，請稍後再試。');
      setBusy(false);
    }
  }
  return <><button className="btn" onClick={login} disabled={busy} style={{marginTop:22}}>{busy?'正在登入…':'使用 Google 帳號登入'}</button>{error&&<p role="alert" className="notice error">{error}</p>}</>;
}
