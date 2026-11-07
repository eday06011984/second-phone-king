import { env } from 'cloudflare:workers';
import { collectTraffic } from '@/lib/traffic/handler';
export function POST(req: Request) { return collectTraffic(req, env); }
