// Check a Strudel file plays without errors (see checker.mjs).
// Usage: scripts/run-node.sh scripts/check.mjs <file.js> [bars]
import { readFileSync } from 'node:fs';
import { checkCode } from './checker.mjs';

const [file, barsArg] = process.argv.slice(2);
const code = readFileSync(file, 'utf8');
const total = Number(barsArg ?? /THE SONG \((\d+) bars\)/.exec(code)?.[1] ?? 8);
const report = await checkCode(code, total);
console.log(JSON.stringify({ ...report, problems: report.problems.slice(0, 20) }, null, 1));
if (report.problems.length) process.exitCode = 1;
