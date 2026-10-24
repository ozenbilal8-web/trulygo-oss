import { readFileSync } from 'node:fs';

// CI diagnostics only: never print local credentials or auth session material.
const lines = readFileSync(process.argv[2], 'utf8').split(/\r?\n/);
for (const line of lines.slice(-80)) {
  if (/key|secret|password|token|authorization|cookie|postgres:\/\//i.test(line)) {
    console.log('[credential-related log line omitted]');
  } else {
    console.log(line.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted]').replace(/sb_(?:publishable|secret)_[A-Za-z0-9_-]+/g, '[redacted]'));
  }
}
