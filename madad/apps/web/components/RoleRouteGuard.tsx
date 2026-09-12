'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export default function RoleRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (pathname === '/login') return;
    const raw = localStorage.getItem('madad_user');
    if (!raw) return;
    try {
      const user = JSON.parse(raw);
      const isField = user.role === 'TECHNICIAN' || user.role === 'SUPERVISOR';
      if (isField && pathname !== '/field') router.replace('/field');
      if (!isField && pathname === '/field') router.replace('/dashboard');
    } catch {
      // Invalid local profile is handled by page-level authentication.
    }
  }, [pathname, router]);

  return <>{children}</>;
}
