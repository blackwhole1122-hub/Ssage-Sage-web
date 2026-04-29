const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(2);
}

function stripMarkdown(md = '') {
  return String(md)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`.*?`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>#-]/g, ' ')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
  const { data, error } = await supabase
    .from('blog_posts')
    .select('id, slug, title, seo_title, description, seo_description, content, published, scheduled_at')
    .eq('published', true)
    .order('created_at', { ascending: false })
    .limit(5000);

  if (error) {
    console.error('Failed to fetch blog_posts:', error.message);
    process.exit(2);
  }

  const now = Date.now();
  const issues = [];

  for (const row of data || []) {
    if (row.scheduled_at && new Date(row.scheduled_at).getTime() > now) continue;

    const title = String(row.seo_title || row.title || '').trim();
    const description = String(row.seo_description || row.description || '').trim() || stripMarkdown(row.content || '').slice(0, 160);

    if (!title) issues.push({ slug: row.slug, type: 'missing_title', detail: 'title empty' });
    if (title && (title.length < 20 || title.length > 70)) {
      issues.push({ slug: row.slug, type: 'title_length', detail: `${title.length} chars (recommended 20-70)` });
    }

    if (!description) issues.push({ slug: row.slug, type: 'missing_description', detail: 'description empty' });
    if (description && (description.length < 80 || description.length > 180)) {
      issues.push({ slug: row.slug, type: 'description_length', detail: `${description.length} chars (recommended 80-180)` });
    }
  }

  if (!issues.length) {
    console.log('OK: SEO meta quality checks passed for published posts.');
    process.exit(0);
  }

  console.log(`Found ${issues.length} SEO meta issue(s):`);
  for (const issue of issues.slice(0, 200)) {
    console.log(`- /blog/${issue.slug} [${issue.type}] ${issue.detail}`);
  }
  if (issues.length > 200) console.log(`... ${issues.length - 200} more issue(s)`);

  process.exit(1);
})();
