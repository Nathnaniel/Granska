'use client';

import type { Status } from '@/lib/demoCheck';
import { useT } from '@/lib/i18n';
import { Pill } from './Pill';

// The status colours are too light for small text on white, so the colour goes
// on the dot and tint and the label stays dark enough to read.
const STYLES: Record<Status, { pill: string; dot: string }> = {
  valid: { pill: 'bg-valid/12', dot: 'bg-valid' },
  risky: { pill: 'bg-risky/12', dot: 'bg-risky' },
  invalid: { pill: 'bg-invalid/12', dot: 'bg-invalid' },
  unknown: { pill: 'bg-idle', dot: 'bg-muted' },
};

export function StatusPill({ status }: { status: Status }) {
  const t = useT();
  return (
    <Pill className={`text-ink ${STYLES[status].pill}`}>
      <span aria-hidden className={`size-1.5 rounded-full ${STYLES[status].dot}`} />
      {t(`status.${status}`)}
    </Pill>
  );
}
