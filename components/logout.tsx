'use client';
import {useState} from 'react';
export default function Logout(){
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function logout(){setBusy(true);setError('');try{const r=await fetch('/api/auth/logout',{method:'POST'});if(!r.ok)throw Error();window.location.assign('/seller');}catch{setBusy(false);setError('登出失敗，請再試一次。');}}
 return <div><button className="chip" onClick={logout} disabled={busy}>{busy?'登出中…':'登出'}</button>{error&&<p role="alert">{error}</p>}</div>;
}
