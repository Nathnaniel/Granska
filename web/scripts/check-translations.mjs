// Fails if any language is missing a string, has an extra one, or drops a {placeholder}.
import { readFileSync } from 'node:fs';

const load = (l) => JSON.parse(readFileSync(new URL(`../messages/${l}.json`, import.meta.url), 'utf8'));
const flatten = (value, prefix = '', out = {}) => {
  if (typeof value === 'string') out[prefix] = value;
  else for (const [k, v] of Object.entries(value)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
};
const slots = (s) => (s.match(/\{\w+\}/g) ?? []).sort().join();

const en = flatten(load('en'));
let problems = 0;
for (const locale of ['es', 'sv', 'fr']) {
  const other = flatten(load(locale));
  for (const key of new Set([...Object.keys(en), ...Object.keys(other)])) {
    if (!(key in other) || !(key in en)) { console.log(`${locale}: key mismatch ${key}`); problems += 1; }
    else if (slots(en[key]) !== slots(other[key])) { console.log(`${locale}: placeholder mismatch ${key}`); problems += 1; }
  }
}
console.log(problems ? `${problems} problems` : `All languages match: ${Object.keys(en).length} strings each`);
process.exit(problems ? 1 : 0);
