import { getHandlers } from '@/lib/verify-engine.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = (request: Request) => getHandlers().post(request);
