import { Dashboard } from '@/components/Dashboard';
import { Footer } from '@/components/Footer';
import { Nav } from '@/components/Nav';
import { CornerArt } from '@/components/ui/CornerArt';

export default function Home() {
  return (
    <>
      <CornerArt />
      <Nav bare />
      <main id="content"><Dashboard /></main>
      <Footer />
    </>
  );
}
