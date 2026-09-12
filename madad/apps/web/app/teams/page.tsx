'use client';

import { FormEvent, useEffect, useState } from 'react';
import AppShell from '../../components/AppShell';
import { api } from '../../lib/api';
import styles from './teams.module.css';

const memberRoles = ['LEAD', 'SUPERVISOR', 'TECHNICIAN', 'DRIVER', 'SUPPORT'];

export default function Page() {
    const [teams, setTeams] = useState<any[]>([]);
    const [myTeams, setMyTeams] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [sites, setSites] = useState<any[]>([]);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedMembers, setSelectedMembers] = useState<Record<string, string>>({});
    const [isAdmin, setIsAdmin] = useState(false);
    const [error, setError] = useState('');

    async function load() {
        const [all, mine, inbox] = await Promise.all([
            api<any[]>('/teams'),
            api<any[]>('/teams/me'),
            api<any[]>('/operations/notifications')
        ]);
        setTeams(all);
        setMyTeams(mine);
        setNotifications(inbox);
    }

    useEffect(() => {
        load().catch(e => setError(e instanceof Error ? e.message : 'خطأ'));
        api<any[]>('/operations/sites').then(setSites).catch(() => undefined);

        try {
            const stored = JSON.parse(localStorage.getItem('madad_user') || '{}');
            const admin = stored.role === 'ADMIN';
            setIsAdmin(admin);
            if (admin) api<any[]>('/teams/available-members').then(setUsers).catch(() => undefined);
        } catch {
            setIsAdmin(false);
        }
    }, []);

    async function markRead(id: string) {
        await api(`/operations/notifications/${id}/read`, { method: 'PATCH', body: '{}' });
        setNotifications(current => current.map(n => n.id === id ? { ...n, isRead: true } : n));
    }

    function toggleMember(userId: string) {
        setSelectedMembers(current => {
            const next = { ...current };
            if (next[userId]) delete next[userId];
            else next[userId] = 'TECHNICIAN';
            return next;
        });
    }

    async function createTeam(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const site = sites.find(s => s.id === form.get('siteId'));
        try {
            await api('/teams', {
                method: 'POST',
                body: JSON.stringify({
                    code: form.get('code'),
                    name: form.get('name'),
                    specialization: form.get('specialization'),
                    skills: String(form.get('skills') || '').split(',').map(x => x.trim()).filter(Boolean),
                    siteId: form.get('siteId'),
                    zoneId: null,
                    latitude: site?.latitude ?? 21.4133,
                    longitude: site?.longitude ?? 39.8934,
                    maxConcurrentJobs: Number(form.get('maxConcurrentJobs') || 2),
                    members: Object.entries(selectedMembers).map(([userId, memberRole]) => ({ userId, memberRole }))
                })
            });
            setShowCreate(false);
            setSelectedMembers({});
            await load();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'خطأ');
        }
    }

    const myTeamIds = new Set(myTeams.map(m => m.teamId));
    const urgentUnread = notifications.filter(n => !n.isRead && n.priority === 'URGENT');

    return (
        <AppShell>
            <section className={styles.page}>
                <header className={styles.topbar}>
                    <div>
                        <div className={styles.eyebrow}><span />WORKFORCE</div>
                        <h1 className={styles.title}>الفرق الميدانية</h1>
                    </div>
                    {isAdmin && (
                        <button className={styles.teamCard} style={{ padding: '12px 18px', cursor: 'pointer' }} onClick={() => setShowCreate(v => !v)}>
                            + إضافة فريق جديد
                        </button>
                    )}
                </header>

                {error && <div className={styles.teamCard} style={{ marginBottom: 16 }}>{error}</div>}

                {urgentUnread.length > 0 && (
                    <section style={{ display: 'grid', gap: 10, marginBottom: 22 }}>
                        {urgentUnread.map(n => (
                            <button
                                key={n.id}
                                onClick={() => markRead(n.id)}
                                className={styles.teamCard}
                                style={{ textAlign: 'right', cursor: 'pointer', border: '1px solid rgba(164,56,56,.45)' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'center' }}>
                                    <div>
                                        <strong>{n.title}</strong>
                                        <div style={{ marginTop: 6 }}>{n.message}</div>
                                        {n.incident && <small>{n.incident.code} · {n.incident.severity} · {n.incident.status}</small>}
                                    </div>
                                    <span>عاجل</span>
                                </div>
                            </button>
                        ))}
                    </section>
                )}

                {showCreate && isAdmin && (
                    <form onSubmit={createTeam} className={styles.teamCard} style={{ marginBottom: 22 }}>
                        <h3 style={{ marginTop: 0 }}>إنشاء فريق وإضافة أعضائه</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12 }}>
                            <input name="code" required placeholder="كود الفريق" />
                            <input name="name" required placeholder="اسم الفريق" />
                            <input name="specialization" required placeholder="التخصص" />
                            <input name="skills" placeholder="Electrical, Generator" />
                            <select name="siteId" required>
                                <option value="">اختر الموقع</option>
                                {sites.map(site => <option value={site.id} key={site.id}>{site.name}</option>)}
                            </select>
                            <input name="maxConcurrentJobs" type="number" min="1" defaultValue="2" />
                        </div>

                        <h4>أعضاء الفريق</h4>
                        <div style={{ display: 'grid', gap: 10 }}>
                            {users.map(user => (
                                <div key={user.id} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input type="checkbox" checked={Boolean(selectedMembers[user.id])} onChange={() => toggleMember(user.id)} />
                                    <strong>{user.name}</strong>
                                    <span>{user.role}</span>
                                    {selectedMembers[user.id] && (
                                        <select
                                            value={selectedMembers[user.id]}
                                            onChange={e => setSelectedMembers(current => ({ ...current, [user.id]: e.target.value }))}
                                        >
                                            {memberRoles.map(role => <option value={role} key={role}>{role}</option>)}
                                        </select>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button type="submit" style={{ marginTop: 16 }}>حفظ الفريق</button>
                    </form>
                )}

                {myTeams.length > 0 && (
                    <div className={styles.teamCard} style={{ marginBottom: 22 }}>
                        <strong>فريقي الآن</strong>
                        {myTeams.map(membership => (
                            <div key={membership.id} style={{ marginTop: 10 }}>
                                <span>{membership.team.name} — دوري: {membership.memberRole}</span>
                                {membership.team.dispatches?.length ? (
                                    membership.team.dispatches.map((d: any) => (
                                        <div key={d.id} style={{ marginTop: 6 }}>
                                            ماسكين البلاغ <strong>{d.incident.code} — {d.incident.title}</strong> ({d.incident.status})
                                        </div>
                                    ))
                                ) : <div style={{ marginTop: 6 }}>الفريق غير ماسك بلاغ حاليًا.</div>}
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.teamsGrid}>
                    {teams.map((t) => (
                        <article className={styles.teamCard} key={t.id}>
                            <div className={styles.cardTop}>
                                <div className={styles.teamIdentity}>
                                    <div className={styles.teamIcon}>
                                        <svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2" /><path d="M3.5 19c.4-4 2.4-6 5.5-6s5.1 2 5.5 6" /><path d="M15 14c3 0 4.6 1.7 5 5" /></svg>
                                    </div>
                                    <div>
                                        <span className={styles.teamLabel}>{myTeamIds.has(t.id) ? 'MY FIELD TEAM' : 'FIELD TEAM'}</span>
                                        <h3>{t.name}</h3>
                                    </div>
                                </div>
                                <span className={`${styles.status} ${styles[`status_${String(t.status).toLowerCase()}`] || ''}`}><span />{t.status}</span>
                            </div>

                            <div className={styles.meta}>
                                <div className={styles.metaItem}><span className={styles.metaLabel}>التخصص</span><strong>{t.specialization}</strong></div>
                                <div className={styles.metaItem}><span className={styles.metaLabel}>الموقع</span><strong>{t.site?.name}</strong></div>
                            </div>

                            <div className={styles.skillsSection}>
                                <span className={styles.sectionLabel}>الأعضاء والأدوار</span>
                                <div className={styles.skills}>
                                    {t.members?.map((m: any) => (
                                        <span className={styles.skill} key={m.id}>{m.user?.name} · {m.memberRole}</span>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.skillsSection}>
                                <span className={styles.sectionLabel}>البلاغات الحالية</span>
                                {t.dispatches?.length ? t.dispatches.map((d: any) => (
                                    <div key={d.id} style={{ marginTop: 8 }}>
                                        <strong>{d.incident.code}</strong> — {d.incident.title} · {d.incident.severity}
                                    </div>
                                )) : <div style={{ marginTop: 8 }}>متاح ولا يوجد بلاغ نشط.</div>}
                            </div>

                            <div className={styles.workload}>
                                <div>
                                    <span className={styles.workloadLabel}>المهام الحالية</span>
                                    <div className={styles.workloadValue}><strong>{t.activeJobs}</strong><span>/ {t.maxConcurrentJobs}</span></div>
                                </div>
                                <div className={styles.workloadTrack}>
                                    <span style={{ width: `${t.maxConcurrentJobs ? Math.min((t.activeJobs / t.maxConcurrentJobs) * 100, 100) : 0}%` }} />
                                </div>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </AppShell>
    );
}
