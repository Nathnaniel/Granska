import { redirect } from 'next/navigation';

// Sign-in is switched off for now, so this page sends visitors to the checker.
export default async function GetStartedRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}`);
}
