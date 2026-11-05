'use strict';
// Vercel entry point. Vercel imports this file instead of running server.js.
// It blocks outgoing port 25, so the mailbox check would only wait and time out.
// It also sets X-Forwarded-For itself, so the rate limit can trust that header.
process.env.SKIP_MAILBOX ??= '1';
process.env.TRUST_PROXY ??= '1';

const { createHandler } = require('../server.js');

module.exports = createHandler();
