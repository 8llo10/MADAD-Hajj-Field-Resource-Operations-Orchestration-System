'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import styles from './IncidentDetailsModal.module.css';

type Incident = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  requiredSkills: string[];
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: string;
  slaMinutes: number;
  autoAssignmentEnabled: boolean;
  openedAt: string;
  assignedAt?: string | null;
  resolvedAt?: string | null;
  reopenCount: number;
  site?: { name: string };
  zone?: { name: string } | null;
  resolvedByUser?: { name: string } | null;
  resolvedByTeam?: { name: string } | null;
  dispatches?: Array<{
    id: string;
    status: string;
    assignmentMode: string;
    distanceKm: number;
    etaMinutes: number;
    team?: { name: string };
    assignedBy?: { name: string } | null;
  }>;
};

type Props = {
  incidentId: string | null;
  onClose: () => void;
  onSaved: () => void;
};

export default function IncidentDetailsModal({ incidentId, onClose, onSaved }: Props) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', category: '', requiredSkills: '', severity: 'MEDIUM', slaMinutes: 30, autoAssignmentEnabled: true
  });

  const canEdit = useMemo(() => {
    if (typeof window === 'undefined') return false;
    try {
      const user = JSON.parse(localStorage.getItem('madad_user') || '{}');
      return user.role === 'ADMIN' || user.role === 'COMMANDER';
    } catch { return false; }
  }, [incidentId]);

  useEffect(() => {
    if (!incidentId) return;
    setError('');
    setEditing(false);
    api<Incident>(`/incidents/${incidentId}`)
      .then(row => {
        setIncident(row);
        setForm({
          title: row.title,
          description: row.description,
          category: row.category,
          requiredSkills: row.requiredSkills.join(', '),
          severity: row.severity,
          slaMinutes: row.slaMinutes,
          autoAssignmentEnabled: row.autoAssignmentEnabled
        });
      })
      .catch(e => setError(e.message));
  }, [incidentId]);

  if (!incidentId) return null;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!incident) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api<Incident>(`/incidents/${incident.id}/details`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          category: form.category.trim(),
          requiredSkills: form.requiredSkills.split(',').map(x => x.trim()).filter(Boolean),
          severity: form.severity,
          slaMinutes: Number(form.slaMinutes),
          autoAssignmentEnabled: form.autoAssignmentEnabled
        })
      });
      setIncident(prev => prev ? { ...prev, ...updated } : updated);
      setEditing(false);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر حفظ التعديلات');
    } finally { setSaving(false); }
  }

  const latestDispatch = incident?.dispatches?.[0];

  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <section className={styles.modal} onMouseDown={e => e.stopPropagation()} dir="rtl">
        <header className={styles.header}>
          <div>
            <span className={styles.code}>{incident?.code || '...'}</span>
            <h2>{incident?.title || 'تفاصيل البلاغ'}</h2>
          </div>
          <div className={styles.headerActions}>
            {canEdit && incident && !editing && <button className={styles.edit} onClick={() => setEditing(true)}>تعديل البيانات</button>}
            <button className={styles.close} onClick={onClose} aria-label="إغلاق">×</button>
          </div>
        </header>

        {error && <div className={styles.error}>{error}</div>}
        {!incident && !error && <div className={styles.loading}>جاري تحميل تفاصيل البلاغ...</div>}

        {incident && !editing && (
          <div className={styles.content}>
            <div className={styles.statusRow}>
              <span>{incident.status}</span><span>{incident.severity}</span><span>SLA {incident.slaMinutes} دقيقة</span>
            </div>
            <div className={styles.grid}>
              <article><small>الوصف</small><p>{incident.description}</p></article>
              <article><small>التصنيف</small><strong>{incident.category}</strong></article>
              <article><small>الموقع</small><strong>{incident.site?.name}{incident.zone?.name ? ` · ${incident.zone.name}` : ''}</strong></article>
              <article><small>المهارات المطلوبة</small><strong>{incident.requiredSkills.join(' · ') || '—'}</strong></article>
              <article><small>إعادة الفتح</small><strong>{incident.reopenCount} مرة</strong></article>
              <article><small>التوجيه التلقائي</small><strong>{incident.autoAssignmentEnabled ? 'مفعّل' : 'متوقف'}</strong></article>
            </div>
            {latestDispatch && (
              <div className={styles.assignment}>
                <div><small>الفريق الحالي</small><strong>{latestDispatch.team?.name || '—'}</strong></div>
                <div><small>طريقة الإسناد</small><strong>{latestDispatch.assignmentMode}</strong></div>
                <div><small>المسافة / الوصول</small><strong>{latestDispatch.distanceKm.toFixed(2)} كم · {latestDispatch.etaMinutes} د</strong></div>
              </div>
            )}
            {incident.resolvedByUser && (
              <div className={styles.resolution}>أغلق البلاغ: <strong>{incident.resolvedByUser.name}</strong>{incident.resolvedByTeam ? ` · ${incident.resolvedByTeam.name}` : ''}</div>
            )}
          </div>
        )}

        {incident && editing && (
          <form className={styles.form} onSubmit={save}>
            <label>عنوان البلاغ<input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required minLength={3} /></label>
            <label className={styles.full}>الوصف<textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required minLength={3} /></label>
            <label>التصنيف<input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required /></label>
            <label>الخطورة<select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option></select></label>
            <label>SLA بالدقائق<input type="number" min={1} max={1440} value={form.slaMinutes} onChange={e => setForm({ ...form, slaMinutes: Number(e.target.value) })} /></label>
            <label>المهارات المطلوبة<input value={form.requiredSkills} onChange={e => setForm({ ...form, requiredSkills: e.target.value })} placeholder="Electrical, Generator" /></label>
            <label className={styles.toggle}><input type="checkbox" checked={form.autoAssignmentEnabled} onChange={e => setForm({ ...form, autoAssignmentEnabled: e.target.checked })} /> السماح بالتوجيه التلقائي</label>
            <div className={styles.formActions}><button type="button" onClick={() => setEditing(false)}>إلغاء</button><button type="submit" disabled={saving}>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</button></div>
          </form>
        )}
      </section>
    </div>
  );
}
