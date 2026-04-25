import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

const DEFAULT_PATHS = ['/sitemap.xml', '/blog'];

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const incomingPaths = Array.isArray(body?.paths) ? body.paths : DEFAULT_PATHS;
    const paths = [...new Set(incomingPaths)]
      .filter((path) => typeof path === 'string')
      .map((path) => path.trim())
      .filter((path) => path.startsWith('/'));

    const targetPaths = paths.length > 0 ? paths : DEFAULT_PATHS;

    for (const path of targetPaths) {
      revalidatePath(path);
    }

    return NextResponse.json({
      ok: true,
      revalidatedPaths: targetPaths,
      revalidatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || 'Failed to revalidate paths' },
      { status: 500 }
    );
  }
}
