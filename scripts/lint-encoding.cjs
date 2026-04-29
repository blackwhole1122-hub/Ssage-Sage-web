const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const TARGET_DIRS = ['src', 'public'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git']);
const EXT_ALLOW = new Set(['.js', '.jsx', '.ts', '.tsx', '.json', '.md', '.css', '.html', '.txt']);

const suspectRegexes = [
  /\?꾩껜/,
  /媛寃\?/,
  /\?뮶/,
  /\?덉빟/,
  /�/,
  /\?\?[가-힣A-Za-z0-9]/,
  /[가-힣A-Za-z0-9]\?\?/,
  /[ÃÂÅÐØÞ]{2,}/,
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function isTextFile(file) {
  const ext = path.extname(file).toLowerCase();
  return EXT_ALLOW.has(ext);
}

function scanFile(file) {
  let content = '';
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    return [];
  }

  const lines = content.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const re of suspectRegexes) {
      if (re.test(line)) {
        hits.push({ line: i + 1, text: line.trim().slice(0, 180) });
        break;
      }
    }
  }
  return hits;
}

const files = TARGET_DIRS.flatMap((d) => walk(path.join(ROOT, d))).filter(isTextFile);
const report = [];
for (const file of files) {
  const hits = scanFile(file);
  if (hits.length) report.push({ file, hits });
}

if (!report.length) {
  console.log('OK: no mojibake suspects found.');
  process.exit(0);
}

console.log(`Found mojibake suspects in ${report.length} file(s):`);
for (const r of report) {
  const rel = path.relative(ROOT, r.file);
  for (const h of r.hits.slice(0, 20)) {
    console.log(`- ${rel}:${h.line}: ${h.text}`);
  }
  if (r.hits.length > 20) console.log(`  ... ${r.hits.length - 20} more hit(s)`);
}

process.exit(1);
