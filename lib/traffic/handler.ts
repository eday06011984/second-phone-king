import { publicPath, taipeiDay, trustedRequest } from './policy.mjs';
type TrafficEnv = { TRAFFIC_ENABLED?: string; DB?: D1Database };
const headers = { 'Cache-Control': 'private, no-store' };
export async function collectTraffic(req: Request, env: TrafficEnv) {
  if (env.TRAFFIC_ENABLED !== '1') return Response.json({status:'disabled'}, {status:503, headers});
  if (!trustedRequest(req)) return new Response(null, {status:403, headers});
  if (req.headers.get('content-type') !== 'application/json') return new Response(null,{status:415,headers});
  // Streaming byte limit also covers missing/incorrect Content-Length.
  const reader = req.body?.getReader();
  if (!reader) return new Response(null,{status:400,headers});
  let body = ''; let size = 0;
  const decoder = new TextDecoder();
  try {
    while (true) {
      const {value,done} = await reader.read(); if (done) break;
      size += value.length;
      if (size > 512) { await reader.cancel(); return new Response(null,{status:413,headers}); }
      body += decoder.decode(value,{stream:true});
    }
    body += decoder.decode();
    const parsed = JSON.parse(body);
    if (!parsed || Object.keys(parsed).some(k => !['path','qa'].includes(k)) || typeof parsed.qa !== 'boolean') return new Response(null,{status:400,headers});
    const path = publicPath(parsed.path);
    if (!path) return new Response(null,{status:400,headers});
    if (!env.DB) return Response.json({status:'unavailable'}, {status:503,headers});
    // Test requests never increment public PV. Only a daily successful-probe count is saved.
    const result = parsed.qa
      ? await env.DB.prepare('INSERT INTO traffic_qa_health (day, successful_probes, last_success_at) VALUES (?, 1, ?) ON CONFLICT(day) DO UPDATE SET successful_probes = successful_probes + 1, last_success_at = excluded.last_success_at').bind(taipeiDay(),new Date().toISOString()).run()
      : await env.DB.prepare('INSERT INTO traffic_daily_pageviews (day, path, views) VALUES (?, ?, 1) ON CONFLICT(day, path) DO UPDATE SET views = views + 1').bind(taipeiDay(),path).run();
    if (!result.success) return Response.json({status:'unavailable'}, {status:503,headers});
    return new Response(null,{status:204,headers});
  } catch { return Response.json({status:'unavailable'}, {status:503,headers}); }
}
