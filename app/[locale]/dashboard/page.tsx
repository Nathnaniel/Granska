import { redirect } from 'next/navigation';

// The checker now opens the site, so old dashboard links go there.
export default async function DashboardRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}`);
}
