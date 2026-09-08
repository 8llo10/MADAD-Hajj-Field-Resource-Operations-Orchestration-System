'use client';

import { useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { api } from '../../lib/api';
import styles from './reports.module.css';

export default function Page() {
    const [d, s] = useState<any>(null);

    useEffect(() => {
        api('/reports/summary').then(s);
    }, []);

    return (
        <AppShell>
            <section className={styles.page}>
                <div className={styles.topbar}>
                    <div>
                        <div className={styles.eyebrow}>
                            <span />
                            OPERATIONAL PERFORMANCE
                        </div>

                        <h1 className={styles.title}>
                            التقارير والمؤشرات
                        </h1>
                    </div>
                </div>

                <div className={styles.metrics}>
                    <div className={styles.metric}>
                        <div className={styles.metricTop}>
                            <div className={styles.metricIcon}>
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M5 20V10M12 20V4M19 20v-7M3 20h18" />
                                </svg>
                            </div>

                            <span className={styles.metricNumber}>01</span>
                        </div>

                        <div className={styles.label}>
                            إجمالي البلاغات
                        </div>

                        <div className={styles.num}>
                            {d?.totalIncidents ?? '—'}
                        </div>
                    </div>

                    <div className={styles.metric}>
                        <div className={styles.metricTop}>
                            <div className={styles.metricIcon}>
                                <svg viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="8.5" />
                                    <path d="m8.5 12 2.3 2.3 4.8-5" />
                                </svg>
                            </div>

                            <span className={styles.metricNumber}>02</span>
                        </div>

                        <div className={styles.label}>
                            المحلولة
                        </div>

                        <div className={styles.num}>
                            {d?.resolvedIncidents ?? '—'}
                        </div>
                    </div>

                    <div className={styles.metric}>
                        <div className={styles.metricTop}>
                            <div className={styles.metricIcon}>
                                <svg viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="8.5" />
                                    <path d="M12 7v5l3 2" />
                                </svg>
                            </div>

                            <span className={styles.metricNumber}>03</span>
                        </div>

                        <div className={styles.label}>
                            متوسط ETA
                        </div>

                        <div className={styles.num}>
                            {d?.avgEtaMinutes ?? '—'}
                            <small> د</small>
                        </div>
                    </div>

                    <div className={styles.metric}>
                        <div className={styles.metricTop}>
                            <div className={styles.metricIcon}>
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M12 3 19 6v5c0 4.6-2.8 7.8-7 10-4.2-2.2-7-5.4-7-10V6l7-3Z" />
                                    <path d="m9 12 2 2 4-4" />
                                </svg>
                            </div>

                            <span className={styles.metricNumber}>04</span>
                        </div>

                        <div className={styles.label}>
                            الالتزام بـ SLA
                        </div>

                        <div className={styles.num}>
                            {d?.slaCompliancePct ?? '—'}
                            <small>%</small>
                        </div>
                    </div>
                </div>

                <div className={styles.severityCard}>
                    <div className={styles.sectionHeader}>
                        <div>
                            <div className={styles.sectionEyebrow}>
                                INCIDENT SEVERITY
                            </div>

                            <h2>البلاغات حسب الخطورة</h2>
                        </div>

                        <div className={styles.sectionMark}>
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M12 3 21 19H3L12 3Z" />
                                <path d="M12 9v4M12 16.5v.1" />
                            </svg>
                        </div>
                    </div>

                    <div className={styles.severityList}>
                        {d?.bySeverity?.map((x: any) => (
                            <div
                                className={styles.severityRow}
                                key={x.severity}
                            >
                                <div className={styles.severityName}>
                                    <span className={styles.severityDot} />
                                    <span>{x.severity}</span>
                                </div>

                                <strong>{x.count}</strong>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </AppShell>
    );
}