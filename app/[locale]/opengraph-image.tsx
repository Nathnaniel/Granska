import { ImageResponse } from 'next/og';
import { isLocale, LOCALES, translate } from '@/lib/locales';

export const alt = 'Granska';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const generateStaticParams = () => LOCALES.map((locale) => ({ locale }));

export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const title = translate(isLocale(locale) ? locale : 'en', 'hero.title');
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 80, background: '#efe9d9' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{ width: 64, height: 64, borderRadius: 16, background: '#171615', color: '#fff', fontSize: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>G</div>
        <div style={{ fontSize: 36, color: '#171717' }}>Granska</div>
      </div>
      <div style={{ fontSize: 64, lineHeight: 1.2, color: '#171717', maxWidth: 900 }}>{title}</div>
      <div style={{ width: 160, height: 12, borderRadius: 6, background: '#ca570b' }} />
    </div>,
    size,
  );
}
