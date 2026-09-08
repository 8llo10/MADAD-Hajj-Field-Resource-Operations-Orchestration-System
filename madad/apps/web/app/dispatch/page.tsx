'use client';

import { useEffect, useState } from 'react';

import AppShell from '../../components/AppShell';

import { api } from '../../lib/api';

import styles from './dispatch.module.css';

export default function Dispatch() {
    const [incidents, setIncidents] = useState<any[]>([]);
    const [selected, setSelected] = useState('');
    const [ranked, setRanked] = useState<any[]>([]);
    const [error, setError] = useState('');

    useEffect(() => {
        api<any[]>('/incidents').then(x =>
            setIncidents(
                x.filter(i => !['RESOLVED', 'CLOSED'].includes(i.status))
            )
        )
    }, []);

    async function rank(id: string) {
        setSelected(id);

        try {
            setRanked(
                await api(`/dispatch/rank/${id}`)
            );

            setError('');
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : 'خطأ'
            )
        }
    }

    async function auto() {
        try {
            await api(
                `/dispatch/auto/${selected}`,
                {
                    method: 'POST',
                    body: '{}'
                }
            );

            await rank(selected)
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : 'خطأ'
            )
        }
    }

    return (
        <AppShell>
            <section className={styles.page}>

                <header className={styles.topbar}>
                    <div>
                        <div className={styles.eyebrow}>
                            <span />
                            DISPATCH ENGINE
                        </div>

                        <h1 className={styles.title}>
                            اقتراح وتوجيه الفرق
                        </h1>

                        <p className={styles.subtitle}>
                            ترتيب الفرق لكل بلاغ بدرجة من 100 مع تفسير سبب الاختيار.
                        </p>
                    </div>

                    {selected && (
                        <button
                            className={styles.autoButton}
                            onClick={auto}
                        >
                            <svg viewBox="0 0 24 24" fill="none">
                                <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
                                <path d="m5.6 5.6 2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                                <circle cx="12" cy="12" r="3.5" />
                            </svg>

                            اقتراح أفضل فرقة تلقائيًا
                        </button>
                    )}
                </header>

                {error && (
                    <div className={styles.error}>
                        {error}
                    </div>
                )}

                <div className={styles.dispatchLayout}>

                    <section className={styles.incidentsPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <div className={styles.panelEyebrow}>
                                    ACTIVE INCIDENTS
                                </div>

                                <h2>اختر البلاغ</h2>
                            </div>

                            <div className={styles.panelIcon}>
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M6 3h12v18H6z" />
                                    <path d="M9 8h6M9 12h6M9 16h4" />
                                </svg>
                            </div>
                        </div>

                        <div className={styles.incidentList}>
                            {incidents.map(i => (
                                <button
                                    key={i.id}
                                    className={
                                        selected === i.id
                                            ? `${styles.incidentButton} ${styles.selectedIncident}`
                                            : styles.incidentButton
                                    }
                                    onClick={() => rank(i.id)}
                                >
                                    <div className={styles.incidentContent}>
                                        <span className={styles.incidentCode}>
                                            {i.code}
                                        </span>

                                        <strong>
                                            {i.title}
                                        </strong>
                                    </div>

                                    <div className={styles.arrow}>
                                        <svg viewBox="0 0 24 24" fill="none">
                                            <path d="m9 5 7 7-7 7" />
                                        </svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className={styles.rankingArea}>

                        {ranked.map((r, idx) => (
                            <article
                                key={r.team.id}
                                className={
                                    r.recommended
                                        ? `${styles.rankCard} ${styles.recommended}`
                                        : styles.rankCard
                                }
                            >
                                {r.recommended && (
                                    <div className={styles.recommendedHeader}>
                                        <div className={styles.recommendedLabel}>
                                            <span />
                                            الفرقة المقترحة لهذا البلاغ
                                        </div>

                                        <span className={styles.bestMatch}>
                                            BEST MATCH
                                        </span>
                                    </div>
                                )}

                                <div className={styles.rankTop}>
                                    <div className={styles.teamSide}>
                                        <div className={styles.rankNumber}>
                                            {idx + 1}
                                        </div>

                                        <div className={styles.teamInfo}>
                                            <strong>
                                                {r.team.name}
                                            </strong>

                                            <div className={styles.teamMeta}>
                                                <span>
                                                    {r.team.specialization}
                                                </span>

                                                <i />

                                                <span>
                                                    {r.distanceKm} كم
                                                </span>

                                                <i />

                                                <span>
                                                    ETA {r.etaMinutes} د
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.score}>
                                        <strong>
                                            {r.score}
                                        </strong>

                                        <span>/100</span>
                                    </div>
                                </div>

                                <div className={styles.scoreTrack}>
                                    <span
                                        style={{
                                            width: `${r.score}%`
                                        }}
                                    />
                                </div>

                                <div className={styles.breakdown}>
                                    {Object.entries(r.breakdown).map(([k, v]) => (
                                        <div
                                            className={styles.breakdownItem}
                                            key={k}
                                        >
                                            <div className={styles.breakdownLabel}>
                                                {k}
                                            </div>

                                            <strong>
                                                {String(v)}
                                            </strong>
                                        </div>
                                    ))}
                                </div>

                                <p className={styles.reasons}>
                                    {r.reasons?.join(' · ')}
                                </p>
                            </article>
                        ))}

                    </section>
                </div>
            </section>
        </AppShell>
    )
}