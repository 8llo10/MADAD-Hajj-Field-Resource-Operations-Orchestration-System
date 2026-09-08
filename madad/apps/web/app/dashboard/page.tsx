'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import AppShell from '../../components/AppShell';
import { api } from '../../lib/api';
import styles from './dashboard.module.css';

type Overview = {
    counters: {
        openIncidents: number;
        criticalIncidents: number;
        availableTeams: number;
        busyTeams: number;
        availableResources: number;
        lowStock: number;
    };
    recentIncidents: any[];
};

export default function Dashboard() {
    const [data, setData] = useState<Overview | null>(null);
    const [error, setError] = useState('');

    const load = () =>
        api<Overview>('/operations/overview')
            .then(setData)
            .catch(e => setError(e.message));

    useEffect(() => {
        load();

        const s = io(
            process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'
        );

        [
            'incident.created',
            'incident.updated',
            'dispatch.proposed',
            'dispatch.accepted',
            'dispatch.completed'
        ].forEach(ev => s.on(ev, load));

        return () => {
            s.disconnect();
        };
    }, []);

    return (
        <AppShell>
            <section className={styles.page}>
                <header className={styles.topbar}>
                    <div>
                        <div className={styles.eyebrow}>
                            <span />
                            OPERATIONS COMMAND CENTER
                        </div>

                        <h1 className={styles.title}>مركز العمليات</h1>

                        <p className={styles.subtitle}>
                            صورة تشغيلية موحدة للبلاغات والفرق والموارد.
                        </p>
                    </div>

                    <button
                        className={styles.refresh}
                        onClick={load}
                    >
                        <svg viewBox="0 0 24 24" fill="none">
                            <path d="M20 7v5h-5" />
                            <path d="M19 12a7 7 0 1 1-2-5" />
                        </svg>

                        تحديث
                    </button>
                </header>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <section className={styles.metrics}>
                    {[
                        [
                            'البلاغات المفتوحة',
                            data?.counters.openIncidents ?? '—',
                            'incidents'
                        ],
                        [
                            'البلاغات الحرجة',
                            data?.counters.criticalIncidents ?? '—',
                            'critical'
                        ],
                        [
                            'الفرق المتاحة',
                            data?.counters.availableTeams ?? '—',
                            'teams'
                        ],
                        [
                            'الموارد المتاحة',
                            data?.counters.availableResources ?? '—',
                            'resources'
                        ]
                    ].map(([l, n, kind]) => (
                        <div className={styles.metric} key={l}>
                            <div className={styles.metricTop}>
                                <div className={styles.metricIcon}>
                                    {kind === 'incidents' && (
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M6 3h12v18H6z" />
                                            <path d="M9 8h6M9 12h6M9 16h4" />
                                        </svg>
                                    )}

                                    {kind === 'critical' && (
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M12 3 21 20H3L12 3Z" />
                                            <path d="M12 9v5M12 17v.1" />
                                        </svg>
                                    )}

                                    {kind === 'teams' && (
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <circle cx="9" cy="8" r="3" />
                                            <circle cx="17" cy="9" r="2" />
                                            <path d="M3.5 19c.4-4 2.4-6 5.5-6s5.1 2 5.5 6" />
                                            <path d="M15 14c3 0 4.6 1.7 5 5" />
                                        </svg>
                                    )}

                                    {kind === 'resources' && (
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M4 8 12 4l8 4-8 4-8-4Z" />
                                            <path d="m4 12 8 4 8-4" />
                                            <path d="m4 16 8 4 8-4" />
                                        </svg>
                                    )}
                                </div>

                                <span className={styles.liveMark}>
                                    <span />
                                    LIVE
                                </span>
                            </div>

                            <div className={styles.metricLabel}>
                                {l}
                            </div>

                            <div className={styles.metricValue}>
                                {n}
                            </div>
                        </div>
                    ))}
                </section>

                <section className={styles.operationsGrid}>
                    <div className={styles.incidentsPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <div className={styles.panelEyebrow}>
                                    LIVE INCIDENTS
                                </div>

                                <h2>آخر البلاغات</h2>
                            </div>

                            <div className={styles.liveStatus}>
                                <span />
                                مباشر
                            </div>
                        </div>

                        <div className={styles.tableWrap}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>الكود</th>
                                        <th>البلاغ</th>
                                        <th>الموقع</th>
                                        <th>الخطورة</th>
                                        <th>الحالة</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {data?.recentIncidents.map(i => (
                                        <tr key={i.id}>
                                            <td>
                                                <span className={styles.code}>
                                                    {i.code}
                                                </span>
                                            </td>

                                            <td>
                                                <strong className={styles.incidentTitle}>
                                                    {i.title}
                                                </strong>
                                            </td>

                                            <td>
                                                <div className={styles.location}>
                                                    <svg viewBox="0 0 24 24" fill="none">
                                                        <path d="M12 21s7-5.2 7-12A7 7 0 1 0 5 9c0 6.8 7 12 7 12Z" />
                                                        <circle cx="12" cy="9" r="2.3" />
                                                    </svg>

                                                    {i.site?.name}
                                                </div>
                                            </td>

                                            <td>
                                                <span
                                                    className={`${styles.severity} ${styles[
                                                        `severity_${String(
                                                            i.severity
                                                        ).toLowerCase()}`
                                                        ] || ''
                                                        }`}
                                                >
                                                    <span />
                                                    {i.severity}
                                                </span>
                                            </td>

                                            <td>
                                                <span className={styles.incidentStatus}>
                                                    {i.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <aside className={styles.readinessPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <div className={styles.panelEyebrow}>
                                    READINESS
                                </div>

                                <h2>جاهزية التشغيل</h2>
                            </div>

                            <div className={styles.readinessIcon}>
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M4 18V9M10 18V5M16 18v-6M22 18V3" />
                                </svg>
                            </div>
                        </div>

                        <div className={styles.readinessItems}>
                            <div className={styles.readinessItem}>
                                <div className={styles.readinessTop}>
                                    <div>
                                        <span>فرق مشغولة</span>

                                        <strong>
                                            {data?.counters.busyTeams ?? '—'}
                                        </strong>
                                    </div>

                                    <div className={styles.readinessBadge}>
                                        TEAMS
                                    </div>
                                </div>

                                <div className={styles.decorativeLine}>
                                    <span />
                                </div>
                            </div>

                            <div className={styles.readinessItem}>
                                <div className={styles.readinessTop}>
                                    <div>
                                        <span>أصناف تحت حد إعادة الطلب</span>

                                        <strong>
                                            {data?.counters.lowStock ?? '—'}
                                        </strong>
                                    </div>

                                    <div className={styles.readinessBadge}>
                                        STOCK
                                    </div>
                                </div>

                                <div className={styles.decorativeLine}>
                                    <span />
                                </div>
                            </div>
                        </div>

                        <div className={styles.realtimeNote}>
                            <div className={styles.signal}>
                                <span />
                                <span />
                                <span />
                            </div>

                            <p>
                                تتحدث اللوحة تلقائيًا مع أحداث البلاغ والتوجيه عبر Socket.IO.
                            </p>
                        </div>
                    </aside>
                </section>
            </section>
        </AppShell>
    );
}