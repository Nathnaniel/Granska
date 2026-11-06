import { Dashboard } from '@/components/Dashboard';
import { Footer } from '@/components/Footer';
import { Nav } from '@/components/Nav';
import { CornerArt } from '@/components/ui/CornerArt';
import { isLocale } from '@/lib/locales';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return isLocale(locale) ? pageMetadata(locale, '/dashboard', 'meta.dashboard', false) : {};
}

export default function DashboardPage() {
  return (
    <>
      <CornerArt />
      <Nav account />
      <main id="content"><Dashboard /></main>
      <Footer />
    </>
  );
}
