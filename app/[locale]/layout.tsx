import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { LocaleSync } from '@/components/LocaleSync';
import { SmoothScroll } from '@/components/SmoothScroll';
import { isLocale, LOCALES } from '@/lib/locales';
import { pageMetadata } from '@/lib/seo';
import '../globals.css';

const inter = Inter({ subsets: ['latin', 'latin-ext'], variable: '--font-inter', display: 'swap' });
const switzer = localFont({ src: '../fonts/Switzer-Variable.woff2', weight: '100 900', variable: '--font-switzer', display: 'swap' });

export const dynamicParams = false;
export const generateStaticParams = () => LOCALES.map((locale) => ({ locale }));

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return isLocale(locale) ? pageMetadata(locale, '', 'meta.title') : {};
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return (
    <html lang={locale} className={`${inter.variable} ${switzer.variable}`}>
      <body className="font-sans">
        <LocaleSync />
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
