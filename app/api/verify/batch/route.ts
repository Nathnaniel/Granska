import { getHandlers } from '@/lib/verify-engine.mjs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// A batch can wait on several slow mail servers at once.
export const maxDuration = 60;

export const POST = (request: Request) => getHandlers().batch(request);
