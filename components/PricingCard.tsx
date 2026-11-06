import { Button } from './ui/Button';
import { CheckIcon } from './ui/icons';
import { Pill } from './ui/Pill';

export function PricingCard({ name, price, period, note, items, cta, href, badge, highlighted = false }: {
  name: string; price: string; period?: string; note?: string; items: string[];
  cta: string; href: string; badge?: string; highlighted?: boolean;
}) {
  return (
    <div className="flex h-full flex-col rounded-3xl bg-white p-6">
      <div className="flex h-6 items-center justify-between gap-2">
        <h3>{name}</h3>
        {badge && <Pill className="bg-tan/25 text-ink">{badge}</Pill>}
      </div>
      <p className="mt-4 text-[32px] leading-8 font-medium tracking-[0.01em] text-text">
        <span suppressHydrationWarning>{price}</span>
        {period && <span className="ml-1 text-sm font-normal tracking-normal text-soft">{period}</span>}
      </p>
      <p className="mt-2 h-5 text-xs text-soft">{note}</p>
      <Button href={href} variant={highlighted ? 'primary' : 'secondary'} className="mt-6 w-full">{cta}</Button>
      <ul className="mt-5 grid gap-2.5 text-sm text-text">
        {items.map((item) => (
          <li key={item} className="flex gap-2"><CheckIcon className="mt-0.5 shrink-0 text-valid" />{item}</li>
        ))}
      </ul>
    </div>
  );
}
