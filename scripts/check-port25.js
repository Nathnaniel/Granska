#!/usr/bin/env node
// Run this on a server before relying on it: npm run check-port25
// It reads a mail server's greeting and quits. Nothing is sent.
const dns = require('node:dns/promises');
const net = require('node:net');

const PROBE_DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com'];
const TIMEOUT_MS = 8000;

// Resolves with the greeting line, or rejects if the port can't be reached.
function readGreeting(host, port = 25, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const timer = setTimeout(() => socket.destroy(new Error('timed out')), timeoutMs);
    socket.setEncoding('latin1');
    socket.once('data', (data) => {
      clearTimeout(timer);
      socket.end('QUIT\r\n');
      resolve(data.split('\r\n')[0]);
    });
    socket.once('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

async function checkDomain(domain) {
  const records = await dns.resolveMx(domain);
  const { exchange } = records.sort((a, b) => a.priority - b.priority)[0];
  try {
    const greeting = await readGreeting(exchange);
    console.log(`PASS  ${domain}: ${greeting}`);
    return true;
  } catch (err) {
    console.log(`FAIL  ${domain}: ${exchange} ${err.message}`);
    return false;
  }
}

// Mail servers often refuse a server whose reverse DNS doesn't match its name.
async function checkReverseDns(name) {
  if (!name) {
    console.log('SKIP  Reverse DNS: set HELO_HOST to check it');
    return true;
  }
  try {
    const [ip] = await dns.resolve4(name);
    const names = await dns.reverse(ip);
    const matches = names.some((found) => found.replace(/\.$/, '').toLowerCase() === name.toLowerCase());
    console.log(`${matches ? 'PASS' : 'FAIL'}  Reverse DNS: ${name} is ${ip}, which points back to ${names.join(', ')}`);
    return matches;
  } catch (err) {
    console.log(`FAIL  Reverse DNS: ${name} (${err.code || err.message})`);
    return false;
  }
}

async function main() {
  const results = [];
  for (const domain of PROBE_DOMAINS) results.push(await checkDomain(domain));
  const port25Open = results.some(Boolean);
  const reverseDnsOk = await checkReverseDns(process.env.HELO_HOST);

  if (!port25Open) console.log('\nPort 25 is blocked here. Ask the host to open it, or use another host.');
  else if (!reverseDnsOk) console.log('\nPort 25 is open, but fix reverse DNS before going live.');
  else console.log('\nThis server is ready for the mailbox check.');
  process.exit(port25Open && reverseDnsOk ? 0 : 1);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { readGreeting };
