import BlogPostPage, { generateMetadata as generateBlogPostMetadata } from '../_blogPostPage';

export const revalidate = 60;

export async function generateMetadata(props) {
  return generateBlogPostMetadata(props);
}

export default function RootBlogPostPage(props) {
  return <BlogPostPage {...props} />;
}
