'use client';

import { usePathname } from 'next/navigation';
import { useCallback } from 'react';
import { DEFAULT_LOCALE, isLocale, MESSAGES, translate, type Locale, type MessageKey } from './locales';

const STORAGE_KEY = 'granska.locale';

export function readStoredLocale(): Locale | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function preferredLocale(): Locale {
  const stored = readStoredLocale();
  if (stored) return stored;
  for (const language of navigator.languages ?? []) {
    const code = language.slice(0, 2).toLowerCase();
    if (isLocale(code)) return code;
  }
  return DEFAULT_LOCALE;
}

// The URL is the single source of truth, so back and forward keep working.
export function useLocale(): Locale {
  const segment = usePathname()?.split('/')[1];
  return isLocale(segment) ? segment : DEFAULT_LOCALE;
}

export function useT() {
  const locale = useLocale();
  return useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );
}

export const useMessages = () => MESSAGES[useLocale()];

// Every language ships with the page, so this swaps the copy with no reload.
export function useSwitchLocale() {
  return useCallback((next: Locale) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Private windows can refuse storage. The URL still carries the choice.
    }
    const { pathname, search, hash } = window.location;
    const rest = pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '');
    window.history.pushState(null, '', `/${next}${rest}${search}${hash}`);
  }, []);
}
