import { Footer } from '@/components/Footer';
import { InfoPage } from '@/components/InfoPage';
import { Nav } from '@/components/Nav';
import { isLocale } from '@/lib/locales';
import { pageMetadata } from '@/lib/seo';

const PAGES = ['docs', 'privacy', 'terms'] as const;
type Page = (typeof PAGES)[number];

export const dynamicParams = false;
export const generateStaticParams = () => PAGES.map((page) => ({ page }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string; page: string }> }) {
  const { locale, page } = await params;
  return isLocale(locale) ? pageMetadata(locale, `/${page}`, `meta.${page as Page}`, false) : {};
}

export default async function Info({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  return (
    <>
      <Nav />
      <main id="content"><InfoPage page={page as Page} /></main>
      <Footer />
    </>
  );
}
