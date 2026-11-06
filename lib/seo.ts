import type { Metadata } from 'next';
import { LOCALES, translate, type Locale, type MessageKey } from './locales';

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3001';

export function pageMetadata(locale: Locale, path: string, titleKey: MessageKey, index = true): Metadata {
  const title = translate(locale, titleKey);
  const description = translate(locale, 'meta.description');
  const languages: Record<string, string> = { 'x-default': `/en${path}` };
  for (const code of LOCALES) languages[code] = `/${code}${path}`;
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    alternates: { canonical: `/${locale}${path}`, languages },
    openGraph: { title, description, url: `/${locale}${path}`, siteName: 'Granska', type: 'website', locale },
    twitter: { card: 'summary_large_image', title, description },
    robots: index ? undefined : { index: false },
  };
}
