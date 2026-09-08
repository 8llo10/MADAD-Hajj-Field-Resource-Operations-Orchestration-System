'use client';

import { useEffect, useState } from 'react';

import AppShell from '../../components/AppShell';

import { api } from '../../lib/api';

import styles from './teams.module.css';

export default function Page() {
    const [r, s] = useState<any[]>([]);

    useEffect(() => {
        api<any[]>('/teams').then(s);
    }, []);

    return (
        <AppShell>
            <section className={styles.page}>
                <header className={styles.topbar}>
                    <div>
                        <div className={styles.eyebrow}>
                            <span />
                            WORKFORCE
                        </div>

                        <h1 className={styles.title}>
                            الفرق الميدانية
                        </h1>
                    </div>
                </header>

                <div className={styles.teamsGrid}>
                    {r.map((t) => (
                        <article
                            className={styles.teamCard}
                            key={t.id}
                        >
                            <div className={styles.cardTop}>
                                <div className={styles.teamIdentity}>
                                    <div className={styles.teamIcon}>
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <circle cx="9" cy="8" r="3" />
                                            <circle cx="17" cy="9" r="2" />
                                            <path d="M3.5 19c.4-4 2.4-6 5.5-6s5.1 2 5.5 6" />
                                            <path d="M15 14c3 0 4.6 1.7 5 5" />
                                        </svg>
                                    </div>

                                    <div>
                                        <span className={styles.teamLabel}>
                                            FIELD TEAM
                                        </span>

                                        <h3>
                                            {t.name}
                                        </h3>
                                    </div>
                                </div>

                                <span
                                    className={`${styles.status} ${styles[
                                        `status_${String(t.status).toLowerCase()}`
                                        ] || ''
                                        }`}
                                >
                                    <span />
                                    {t.status}
                                </span>
                            </div>

                            <div className={styles.meta}>
                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>
                                        التخصص
                                    </span>

                                    <strong>
                                        {t.specialization}
                                    </strong>
                                </div>

                                <div className={styles.metaItem}>
                                    <span className={styles.metaLabel}>
                                        الموقع
                                    </span>

                                    <strong className={styles.location}>
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="M12 21s7-5.2 7-12A7 7 0 1 0 5 9c0 6.8 7 12 7 12Z" />
                                            <circle cx="12" cy="9" r="2.3" />
                                        </svg>

                                        {t.site?.name}
                                    </strong>
                                </div>
                            </div>

                            <div className={styles.skillsSection}>
                                <span className={styles.sectionLabel}>
                                    المهارات
                                </span>

                                <div className={styles.skills}>
                                    {t.skills?.map((x: string) => (
                                        <span
                                            className={styles.skill}
                                            key={x}
                                        >
                                            {x}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.workload}>
                                <div>
                                    <span className={styles.workloadLabel}>
                                        المهام الحالية
                                    </span>

                                    <div className={styles.workloadValue}>
                                        <strong>
                                            {t.activeJobs}
                                        </strong>

                                        <span>
                                            / {t.maxConcurrentJobs}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.workloadTrack}>
                                    <span
                                        style={{
                                            width: `${t.maxConcurrentJobs
                                                    ? Math.min(
                                                        (t.activeJobs / t.maxConcurrentJobs) * 100,
                                                        100
                                                    )
                                                    : 0
                                                }%`
                                        }}
                                    />
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </AppShell>
    );
}