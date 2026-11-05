#!/usr/bin/env node
// Refreshes data/disposable-domains.txt from a maintained open-source list.
// Run on each deploy: npm run update-disposable
const fs = require('node:fs');
const path = require('node:path');

const SOURCE =
  'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf';
const TARGET = path.join(__dirname, '..', 'data', 'disposable-domains.txt');
const MIN_EXPECTED = 1000; // A shorter list means a bad download, so keep the old one.

async function main() {
  const res = await fetch(SOURCE, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`Download failed with HTTP ${res.status}`);
  const domains = (await res.text())
    .split('\n')
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith('#'));
  if (domains.length < MIN_EXPECTED) {
    throw new Error(`Only ${domains.length} domains downloaded, keeping the existing list`);
  }
  fs.writeFileSync(TARGET, [...new Set(domains)].sort().join('\n') + '\n');
  console.log(`Wrote ${domains.length} domains to ${path.relative(process.cwd(), TARGET)}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
