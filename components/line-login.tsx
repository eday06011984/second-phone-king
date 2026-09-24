"use client";
import {useEffect,useState} from 'react';
export default function LineLogin({link=false}:{link?:boolean}){
 const [message,setMessage]=useState('');
 useEffect(()=>{const result=new URLSearchParams(location.search).get('line');const messages:Record<string,string>={failed:'LINE 登入未完成，請重新嘗試；若持續失敗請聯絡平台。',cancelled:'你已取消 LINE 授權。',conflict:'此 LINE 已連結另一個帳號，請聯絡平台確認，系統未合併帳號。',linked:'LINE 綁定成功，之後可用 LINE 登入同一個店家。'};setMessage(result?messages[result]||'':'');},[]);
 return <div style={{marginTop:16}}>{message&&<p role="status" className="notice">{message}</p>}<form method="post" action={'/api/auth/line/start'+(link?'?mode=link':'')}><button className="btn" type="submit" style={{background:'#06C755',color:'#fff'}}>{link?'綁定 LINE 至目前帳號':'使用 LINE 帳號登入'}</button></form>{link&&<p className="muted">請確認目前是你的店家帳號，再授權自己的 LINE。已屬於另一帳號的 LINE 不會自動合併。</p>}</div>;
}
