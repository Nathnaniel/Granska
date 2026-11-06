'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useLocale, useT } from '@/lib/i18n';
import type { MessageKey } from '@/lib/locales';

const TITLES: Record<string, MessageKey> = {
  '': 'meta.title', 'get-started': 'meta.getStarted', dashboard: 'meta.dashboard',
  docs: 'meta.docs', privacy: 'meta.privacy', terms: 'meta.terms',
};

// Switching language changes the URL without a reload, so the tags the server
// rendered have to be brought along here.
export function LocaleSync() {
  const locale = useLocale();
  const t = useT();
  const page = usePathname()?.split('/')[2] ?? '';

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = t(TITLES[page] ?? 'meta.title');
    document.querySelector('meta[name="description"]')?.setAttribute('content', t('meta.description'));
  }, [locale, page, t]);

  return null;
}
