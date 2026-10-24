import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

// Fail closed for new or unclassified licenses. This checks package declarations,
// not ownership of application assets or the legal duties of a binary distributor.
const approved = new Set([
  'MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD',
  'BlueOak-1.0.0', 'CC-BY-4.0', 'CC0-1.0', 'Unlicense', 'Python-2.0',
  '(MIT OR Apache-2.0)', '(MIT AND Zlib)', '(MIT OR CC0-1.0)',
  '(MIT OR GPL-3.0-or-later)', // Select MIT for JSZip.
  'MPL-2.0', 'LGPL-3.0-or-later', 'SIL OPEN FONT LICENSE',
  'Apache-2.0 AND LGPL-3.0-or-later',
  'Apache-2.0 AND LGPL-3.0-or-later AND MIT',
]);
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const failures = [];
const summary = new Map();
let checked = 0;
for (const [location, entry] of Object.entries(lock.packages)) {
  if (!location) continue;
  let license = entry.license;
  const packagePath = path.join(location, 'package.json');
  if (!license && existsSync(packagePath)) {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
    license = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type;
  }
  checked++;
  summary.set(license ?? 'UNDECLARED', (summary.get(license ?? 'UNDECLARED') ?? 0) + 1);
  if (!approved.has(license)) failures.push({package: location, version: entry.version, license: license ?? 'UNDECLARED'});
}
console.log(JSON.stringify({checked, licenses: Object.fromEntries([...summary].sort()), failures}, null, 2));
if (failures.length) process.exitCode = 1;
