import './globals.css';

import type { Metadata } from 'next';
import RoleRouteGuard from '../components/RoleRouteGuard';

export const metadata: Metadata = {
    title: 'مَدَد | مركز العمليات الميدانية',
    description: 'Field Resource & Operations Orchestration Platform',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ar" dir="rtl">
            <body><RoleRouteGuard>{children}</RoleRouteGuard></body>
        </html>
    );
}
