'use client';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { productionOrigin, publicPath, qaState } from '@/lib/traffic/policy.mjs';
export default function Traffic() {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (location.origin !== productionOrigin || !publicPath(pathname)) {
      previous.current = null;
      return;
    }
    let attempted = false;
    const send = () => {
      if (document.visibilityState !== 'visible' || attempted || previous.current === pathname) return;
      attempted = true;
      previous.current = pathname;
      let storage: Storage | undefined;
      try { storage = sessionStorage; } catch { /* Per-page QA flag still works. */ }
      const qa = qaState(location.search, storage);
      // No cookies, identifiers, query parameters or automatic retry. A failed fetch is not a recorded PV.
      void fetch('/api/traffic', {method:'POST', credentials:'omit', headers:{'Content-Type':'application/json'}, body:JSON.stringify({path:pathname,qa}), keepalive:true}).catch(() => {});
    };
    send();
    document.addEventListener('visibilitychange', send);
    return () => document.removeEventListener('visibilitychange', send);
  }, [pathname]);
  return null;
}
