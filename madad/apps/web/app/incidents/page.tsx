'use client';

import { FormEvent, useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { api } from '../../lib/api';
import styles from './incidents.module.css';

const activeDispatchStates = ['ACCEPTED', 'DISPATCHED', 'ARRIVED'];

export default function Incidents() {
    const [rows, setRows] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [show, setShow] = useState(false);
    const [error, setError] = useState('');

    const load = () => api<any[]>('/incidents')
        .then(setRows)
        .catch(e => setError(e.message));

    useEffect(() => {
        load();
        api<any[]>('/operations/sites')
            .then(setSites)
            .catch(() => { });
    }, []);

    async function submit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const site = sites.find(s => s.id === f.get('siteId'));
        const autoAssignAfterMinutes = Number(f.get('autoAssignAfterMinutes') || 0);

        const body = {
            title: f.get('title'),
            description: f.get('description'),
            category: f.get('category'),
            requiredSkills: String(f.get('requiredSkills') || '')
                .split(',')
                .map(x => x.trim())
                .filter(Boolean),
            severity: f.get('severity'),
            siteId: f.get('siteId'),
            zoneId: null,
            latitude: site?.latitude ?? 21.4133,
            longitude: site?.longitude ?? 39.8934,
            slaMinutes: Number(f.get('slaMinutes')),
            autoAssignmentEnabled: f.get('autoAssignmentEnabled') === 'on',
            ...(autoAssignAfterMinutes > 0 ? { autoAssignAfterMinutes } : {})
        };

        try {
            await api('/incidents', {
                method: 'POST',
                body: JSON.stringify(body)
            });
            setShow(false);
            load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'خطأ');
        }
    }

    async function reopen(id: string) {
        const note = window.prompt('اكتب سبب إعادة فتح البلاغ');
        if (!note?.trim()) return;

        try {
            await api(`/incidents/${id}/reopen`, {
                method: 'POST',
                body: JSON.stringify({ note: note.trim() })
            });
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'خطأ');
        }
    }

    return (
        <AppShell>
            <section className={styles.page}>
                <header className={styles.topbar}>
                    <div>
                        <div className={styles.eyebrow}><span />INCIDENT MANAGEMENT</div>
                        <h1 className={styles.title}>البلاغات الميدانية</h1>
                        <p className={styles.subtitle}>من التسجيل حتى الإغلاق مع سجل حالة كامل وهوية من حل البلاغ.</p>
                    </div>

                    <button className={styles.newButton} onClick={() => setShow(!show)}>
                        <svg viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" /></svg>
                        بلاغ جديد
                    </button>
                </header>

                {error && <div className={styles.error}>{error}</div>}

                {show && (
                    <form className={styles.formCard} onSubmit={submit}>
                        <div className={styles.formHeader}>
                            <div>
                                <div className={styles.formEyebrow}>NEW INCIDENT</div>
                                <h2>تسجيل بلاغ جديد</h2>
                            </div>
                            <div className={styles.formIcon}>
                                <svg viewBox="0 0 24 24" fill="none"><path d="M6 3h12v18H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></svg>
                            </div>
                        </div>

                        <div className={styles.formGrid}>
                            <div className={styles.field}>
                                <label>عنوان البلاغ</label>
                                <input className={styles.input} name="title" placeholder="عنوان البلاغ" required />
                            </div>

                            <div className={styles.field}>
                                <label>درجة الخطورة</label>
                                <select className={styles.input} name="severity">
                                    <option>LOW</option>
                                    <option>MEDIUM</option>
                                    <option>HIGH</option>
                                    <option>CRITICAL</option>
                                </select>
                            </div>

                            <div className={styles.field}>
                                <label>الفئة</label>
                                <input className={styles.input} name="category" placeholder="Electrical / Water / HVAC" required />
                            </div>

                            <div className={styles.field}>
                                <label>الموقع</label>
                                <select className={styles.input} name="siteId" required>
                                    <option value="">اختر الموقع</option>
                                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>

                            <div className={styles.field}>
                                <label>المهارات المطلوبة</label>
                                <input className={styles.input} name="requiredSkills" placeholder="Electrical, Generator" />
                            </div>

                            <div className={styles.field}>
                                <label>SLA بالدقائق</label>
                                <input className={styles.input} name="slaMinutes" type="number" defaultValue="30" min="1" />
                            </div>

                            <div className={styles.field}>
                                <label>مهلة التعيين التلقائي بالدقائق</label>
                                <input className={styles.input} name="autoAssignAfterMinutes" type="number" min="1" max="120" placeholder="تلقائي حسب الخطورة" />
                            </div>

                            <div className={styles.field}>
                                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                    <input name="autoAssignmentEnabled" type="checkbox" defaultChecked />
                                    فعّل التعيين التلقائي عند انتهاء المهلة
                                </label>
                            </div>
                        </div>

                        <div className={styles.field}>
                            <label>وصف الحالة</label>
                            <textarea className={`${styles.input} ${styles.textarea}`} name="description" placeholder="وصف الحالة" required />
                        </div>

                        <div className={styles.formActions}>
                            <button className={styles.saveButton}>
                                <svg viewBox="0 0 24 24" fill="none"><path d="M5 4h12l2 2v14H5V4Z" /><path d="M8 4v6h8V4M8 20v-6h8v6" /></svg>
                                حفظ البلاغ
                            </button>
                        </div>
                    </form>
                )}

                <section className={styles.incidentsPanel}>
                    <div className={styles.panelHeader}>
                        <div>
                            <div className={styles.panelEyebrow}>FIELD INCIDENTS</div>
                            <h2>سجل البلاغات</h2>
                        </div>
                        <div className={styles.panelIcon}>
                            <svg viewBox="0 0 24 24" fill="none"><path d="M5 6h14M5 12h14M5 18h14" /></svg>
                        </div>
                    </div>

                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>الكود</th>
                                    <th>العنوان</th>
                                    <th>الموقع</th>
                                    <th>الخطورة</th>
                                    <th>الحالة</th>
                                    <th>الفريق</th>
                                    <th>تم الحل بواسطة</th>
                                    <th>إعادة الفتح</th>
                                    <th>SLA</th>
                                    <th></th>
                                </tr>
                            </thead>

                            <tbody>
                                {rows.map(i => {
                                    const currentDispatch = i.dispatches?.find((d: any) => activeDispatchStates.includes(d.status));
                                    const lastDispatch = i.dispatches?.[0];
                                    return (
                                        <tr key={i.id}>
                                            <td><span className={styles.code}>{i.code}</span></td>
                                            <td>
                                                <strong className={styles.incidentTitle}>{i.title}</strong>
                                                <div><small>{i.category}</small></div>
                                            </td>
                                            <td>
                                                <div className={styles.location}>
                                                    <svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.2 7-12A7 7 0 1 0 5 9c0 6.8 7 12 7 12Z" /><circle cx="12" cy="9" r="2.3" /></svg>
                                                    <span>{i.site?.name}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`${styles.severity} ${styles[`severity_${String(i.severity).toLowerCase()}`] || ''}`}>
                                                    <span />{i.severity}
                                                </span>
                                            </td>
                                            <td><span className={styles.status}>{i.status}</span></td>
                                            <td>
                                                {currentDispatch?.team?.name || i.resolvedByTeam?.name || lastDispatch?.team?.name || '—'}
                                            </td>
                                            <td>
                                                {i.resolvedByUser?.name ? (
                                                    <div>
                                                        <strong>{i.resolvedByUser.name}</strong>
                                                        <div><small>{i.resolvedByTeam?.name || ''}</small></div>
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td><strong>{i.reopenCount ?? 0}</strong> مرة</td>
                                            <td><span className={styles.sla}>{i.slaMinutes} د</span></td>
                                            <td>
                                                {['RESOLVED', 'CLOSED'].includes(i.status) && (
                                                    <button type="button" onClick={() => reopen(i.id)}>
                                                        إعادة فتح
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>
            </section>
        </AppShell>
    );
}
