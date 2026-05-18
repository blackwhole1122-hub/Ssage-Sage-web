import BlogListPage from './blog/page';

export const metadata = {
  title: '정보모음 | 싸게사게',
  description: '실속 있는 구매 가이드와 비교 정보를 모아보는 블로그입니다.',
  alternates: { canonical: 'https://www.ssagesage.com/' },
};

export const revalidate = 60;

export default function HomePage(props) {
  return <BlogListPage {...props} />;
}
