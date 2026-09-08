'use client';

import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { api } from '../../lib/api';
import styles from './resources.module.css';

export default function Page() {
    const [r, s] = useState<any[]>([]);

    useEffect(() => {
        api<any[]>('/resources').then(s);
    }, []);

    return (
        <AppShell>
            <section className={styles.page}>
                <div className={styles.topbar}>
                    <div>
                        <div className={styles.eyebrow}>
                            <span />
                            ASSET READINESS
                        </div>

                        <h1 className={styles.title}>الموارد والمعدات</h1>
                    </div>
                </div>

                <div className={styles.tableCard}>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>رقم الأصل</th>
                                    <th>الاسم</th>
                                    <th>النوع</th>
                                    <th>الحالة</th>
                                    <th>الموقع</th>
                                    <th>القدرات</th>
                                </tr>
                            </thead>

                            <tbody>
                                {r.map((x) => (
                                    <tr key={x.id}>
                                        <td>
                                            <span className={styles.assetTag}>
                                                {x.assetTag}
                                            </span>
                                        </td>

                                        <td>
                                            <strong className={styles.assetName}>
                                                {x.name}
                                            </strong>
                                        </td>

                                        <td>
                                            <span className={styles.type}>
                                                {x.type}
                                            </span>
                                        </td>

                                        <td>
                                            <span className={styles.status}>
                                                <span className={styles.statusDot} />
                                                {x.status}
                                            </span>
                                        </td>

                                        <td>
                                            <div className={styles.location}>
                                                <svg viewBox="0 0 24 24" fill="none">
                                                    <path
                                                        d="M12 21s7-5.2 7-12A7 7 0 1 0 5 9c0 6.8 7 12 7 12Z"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                    <circle
                                                        cx="12"
                                                        cy="9"
                                                        r="2.3"
                                                        stroke="currentColor"
                                                        strokeWidth="1.5"
                                                    />
                                                </svg>

                                                <span>{x.site?.name}</span>
                                            </div>
                                        </td>

                                        <td>
                                            <div className={styles.capabilities}>
                                                {x.capabilities?.join(', ')}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </AppShell>
    );
}