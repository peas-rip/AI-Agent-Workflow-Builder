'use client';

import { NhostProvider as NhostAuthProvider } from '@nhost/nhost-js/react';
import { nhost } from '@/lib/nhost';

export function NhostProvider({ children }: { children: React.ReactNode }) {
  return (
    <NhostAuthProvider nhost={nhost}>
      {children}
    </NhostAuthProvider>
  );
}
