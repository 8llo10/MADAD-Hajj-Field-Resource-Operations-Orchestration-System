'use client';

import { useEffect, useMemo, useState } from 'react';
import AppShell from '../../components/AppShell';
import { api } from '../../lib/api';
import styles from './dispatch.module.css';

const activeStates = ['ACCEPTED', 'DISPATCHED', 'ARRIVED'];

export default function Dispatch() {
    const [incidents, setIncidents] = useState<any[]>([]);
    const [selected, setSelected] = useState('');
    const [ranked, setRanked] = useState<any[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    const selectedIncident = useMemo(
        () => incidents.find(i => i.id === selected),
        [incidents, selected]
    );

    const activeDispatch = selectedIncident?.dispatches?.find((d: any) => activeStates.includes(d.status));

    async function loadIncidents() {
        const rows = await api<any[]>('/incidents');
        setIncidents(rows.filter(i => !['CLOSED'].includes(i.status)));
    }

    useEffect(() => {
        loadIncidents().catch(e => setError(e instanceof Error ? e.message : 'خطأ'));
    }, []);

    async function rank(id: string) {
        setSelected(id);
        try {
            setRanked(await api(`/dispatch/rank/${id}`));
            setError('');
        } catch (e) {
            setError(e instanceof Error ? e.message : 'خطأ');
        }
    }

    async function run(action: () => Promise<any>, success: string) {
        try {
            setBusy(true);
            setError('');
            await action();
            setMessage(success);
            await loadIncidents();
            if (selected) await rank(selected);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'خطأ');
        } finally {
            setBusy(false);
        }
    }

    function aiAssign() {
        if (!selected) return;
        return run(
            () => api(`/dispatch/assign/ai/${selected}`, { method: 'POST', body: '{}' }),
            'تم تعيين أفضل فريق مباشرة وإرسال إشعار عاجل لأعضائه.'
        );
    }

    function manualAssign(teamId: string) {
        if (!selected) return;
        const endpoint = activeDispatch ? `/dispatch/reassign/${selected}` : `/dispatch/assign/manual/${selected}`;
        const body = activeDispatch ? { teamId, mode: 'MANUAL' } : { teamId };
        return run(
            () => api(endpoint, { method: 'POST', body: JSON.stringify(body) }),
            activeDispatch ? 'تم تغيير الفريق مع الاحتفاظ بسجل التعيين السابق.' : 'تم تعيين الفريق وإشعار أعضائه.'
        );
    }

    return (
        <AppShell>
            <section className={styles.page}>
                <header className={styles.topbar}>
                    <div>
                        <div className={styles.eyebrow}><span />DISPATCH ENGINE</div>
                        <h1 className={styles.title}>توجيه وإسناد الفرق</h1>
                        <p className={styles.subtitle}>
                            اختر الفريق يدويًا أو دع محرك الترتيب يعيّن الأفضل. إذا انتهت مهلة التعيين بدون تدخل، يتم الإسناد تلقائيًا.
                        </p>
                    </div>

                    {selected && !activeDispatch && (
                        <button className={styles.autoButton} onClick={aiAssign} disabled={busy}>
                            تعيين أفضل فريق بالذكاء
                        </button>
                    )}
                </header>

                {error && <div className={styles.error}>{error}</div>}
                {message && <div className={styles.error} style={{ borderColor: '#7a9b76' }}>{message}</div>}

                {selectedIncident && (
                    <div className={styles.incidentsPanel} style={{ marginBottom: 18 }}>
                        <div className={styles.panelHeader}>
                            <div>
                                <div className={styles.panelEyebrow}>ASSIGNMENT STATUS</div>
                                <h2>{selectedIncident.code} — {selectedIncident.title}</h2>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 14 }}>
                            <span>الحالة: <strong>{selectedIncident.status}</strong></span>
                            <span>مرات إعادة الفتح: <strong>{selectedIncident.reopenCount ?? 0}</strong></span>
                            {activeDispatch ? (
                                <>
                                    <span>الفريق الحالي: <strong>{activeDispatch.team?.name}</strong></span>
                                    <span>نوع التعيين: <strong>{activeDispatch.assignmentMode}</strong></span>
                                </>
                            ) : selectedIncident.autoAssignAt ? (
                                <span>التعيين التلقائي بعد المهلة: <strong>{new Date(selectedIncident.autoAssignAt).toLocaleString('ar-SA')}</strong></span>
                            ) : null}
                        </div>
                    </div>
                )}

                <div className={styles.dispatchLayout}>
                    <section className={styles.incidentsPanel}>
                        <div className={styles.panelHeader}>
                            <div>
                                <div className={styles.panelEyebrow}>ACTIVE INCIDENTS</div>
                                <h2>اختر البلاغ</h2>
                            </div>
                        </div>

                        <div className={styles.incidentList}>
                            {incidents.filter(i => !['RESOLVED'].includes(i.status)).map(i => {
                                const d = i.dispatches?.find((x: any) => activeStates.includes(x.status));
                                return (
                                    <button
                                        key={i.id}
                                        className={selected === i.id ? `${styles.incidentButton} ${styles.selectedIncident}` : styles.incidentButton}
                                        onClick={() => rank(i.id)}
                                    >
                                        <div className={styles.incidentContent}>
                                            <span className={styles.incidentCode}>{i.code}</span>
                                            <strong>{i.title}</strong>
                                            <small>{d ? `مُسند إلى ${d.team?.name}` : 'بانتظار التعيين'}</small>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </section>

                    <section className={styles.rankingArea}>
                        {ranked.map((r, idx) => (
                            <article key={r.team.id} className={r.recommended ? `${styles.rankCard} ${styles.recommended}` : styles.rankCard}>
                                {r.recommended && (
                                    <div className={styles.recommendedHeader}>
                                        <div className={styles.recommendedLabel}><span />الفرقة المقترحة لهذا البلاغ</div>
                                        <span className={styles.bestMatch}>BEST MATCH</span>
                                    </div>
                                )}

                                <div className={styles.rankTop}>
                                    <div className={styles.teamSide}>
                                        <div className={styles.rankNumber}>{idx + 1}</div>
                                        <div className={styles.teamInfo}>
                                            <strong>{r.team.name}</strong>
                                            <div className={styles.teamMeta}>
                                                <span>{r.team.specialization}</span><i />
                                                <span>{r.team.status}</span><i />
                                                <span>{r.distanceKm} كم</span><i />
                                                <span>ETA {r.etaMinutes} د</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className={styles.score}><strong>{r.score}</strong><span>/100</span></div>
                                </div>

                                <div className={styles.scoreTrack}><span style={{ width: `${r.score}%` }} /></div>
                                <div className={styles.breakdown}>
                                    {Object.entries(r.breakdown).map(([k, v]) => (
                                        <div className={styles.breakdownItem} key={k}>
                                            <div className={styles.breakdownLabel}>{k}</div>
                                            <strong>{String(v)}</strong>
                                        </div>
                                    ))}
                                </div>
                                <p className={styles.reasons}>{r.reasons?.join(' · ')}</p>

                                <button
                                    className={styles.autoButton}
                                    style={{ marginTop: 12 }}
                                    disabled={busy || activeDispatch?.teamId === r.team.id || r.score < 45}
                                    onClick={() => manualAssign(r.team.id)}
                                >
                                    {activeDispatch?.teamId === r.team.id
                                        ? 'الفريق الحالي'
                                        : activeDispatch
                                            ? 'تغيير التعيين لهذا الفريق'
                                            : 'تعيين هذا الفريق'}
                                </button>
                            </article>
                        ))}
                    </section>
                </div>
            </section>
        </AppShell>
    );
}
