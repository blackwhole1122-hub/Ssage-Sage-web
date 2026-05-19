import { permanentRedirect } from 'next/navigation';

export const revalidate = 60;

export async function generateMetadata() {
  return {
    robots: { index: false, follow: true },
  };
}

export default async function LegacyBlogPostRedirectPage({ params }) {
  const { slug } = await params;
  permanentRedirect(`/${encodeURIComponent(slug)}`);
}
