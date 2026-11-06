'use client';

import { useEffect } from 'react';
import { preferredLocale } from '@/lib/i18n';

// Unprefixed addresses like / and /get-started?plan=pro land here. The saved choice
// lives in the browser, so this has to run client side.
export function LocaleRedirect({ path = '' }: { path?: string }) {
  useEffect(() => {
    const { search, hash } = window.location;
    window.location.replace(`/${preferredLocale()}${path}${search}${hash}`);
  }, [path]);
  return <noscript><a href={`/en${path}`}>Continue to Granska</a></noscript>;
}
