'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import styles from './field.module.css';

type Dispatch = { id:string; status:string; etaMinutes:number; distanceKm:number; incident:{ code:string; title:string; description:string; severity:string; slaMinutes:number; status:string; site:{name:string}; zone?:{name:string}|null } };
type Membership = { memberRole:string; team:{ id:string; name:string; code:string; specialization:string; skills:string[]; site:{name:string}; zone?:{name:string}|null; dispatches:Dispatch[]; members:{memberRole:string;user:{id:string;name:string}}[] } };
type Workspace = { user:{name:string;email:string;role:string;locationUpdatedAt?:string|null}; memberships:Membership[]; performance:{technicianScore:number;teamScore:number;completedIncidents:number;recent:any[]} };

export default function FieldWorkspace() {
  const router = useRouter();
  const [data,setData]=useState<Workspace|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState('');
  const [summary,setSummary]=useState('');
  const [actions,setActions]=useState('فحص مصدر العطل\nعزل الدائرة المتأثرة\nإعادة التشغيل والتحقق');
  const [evidence,setEvidence]=useState('');
  const [resolving,setResolving]=useState<string|null>(null);

  const load=()=>api<Workspace>('/field/me').then(setData).catch(e=>setError(e.message));
  useEffect(()=>{
    const raw=localStorage.getItem('madad_user');
    if(!raw){router.replace('/login');return;}
    try{const u=JSON.parse(raw);if(!['TECHNICIAN','SUPERVISOR'].includes(u.role)){router.replace('/dashboard');return;}}catch{router.replace('/login');return;}
    load();
  },[router]);

  const active=useMemo(()=>data?.memberships.flatMap(m=>m.team.dispatches.map(d=>({d,m})))||[],[data]);

  async function action(id:string,path:string){
    try{setBusy(id+path);setError('');await api(`/field/dispatch/${id}/${path}`,{method:'POST'});await load();}
    catch(e){setError(e instanceof Error?e.message:'تعذر تنفيذ الإجراء');}finally{setBusy('');}
  }

  function updateLocation(){
    if(!navigator.geolocation){setError('المتصفح لا يدعم تحديد الموقع');return;}
    setBusy('location');setError('');
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{await api('/field/location',{method:'PATCH',body:JSON.stringify({latitude:pos.coords.latitude,longitude:pos.coords.longitude})});await load();}
      catch(e){setError(e instanceof Error?e.message:'تعذر تحديث الموقع');}finally{setBusy('');}
    },()=>{setBusy('');setError('لم يتم السماح بالوصول إلى الموقع');},{enableHighAccuracy:true,timeout:10000});
  }

  async function resolve(id:string){
    try{
      setBusy(id+'resolve');setError('');
      const actionsTaken=actions.split('\n').map(x=>x.trim()).filter(Boolean);
      const evidenceUrls=evidence.split('\n').map(x=>x.trim()).filter(Boolean);
      const result:any=await api(`/field/dispatch/${id}/resolve`,{method:'POST',body:JSON.stringify({summary,actionsTaken,evidenceUrls})});
      setResolving(null);setSummary('');setEvidence('');await load();
      alert(`تم إغلاق البلاغ. كفاءتك: ${result.technicianScore}/100 — كفاءة الفريق: ${result.teamScore}/100`);
    }catch(e){setError(e instanceof Error?e.message:'تعذر إغلاق البلاغ');}finally{setBusy('');}
  }

  function logout(){localStorage.removeItem('madad_access_token');localStorage.removeItem('madad_user');router.replace('/login');}
  if(!data)return <main className={styles.loading}>جاري تحميل مساحة العمل الميدانية...</main>;
  const membership=data.memberships[0];

  return <main className={styles.page} dir="rtl">
    <header className={styles.header}>
      <div><div className={styles.brand}>مَدَد <span>FIELD</span></div><h1>مساحة العمل الميدانية</h1><p>{data.user.name} · {membership?.team.name||'بدون فريق'} · {membership?.memberRole||data.user.role}</p></div>
      <div className={styles.headerActions}><button onClick={updateLocation} disabled={busy==='location'}>{busy==='location'?'جاري تحديد الموقع':'تحديث موقعي'}</button><button className={styles.ghost} onClick={logout}>تسجيل الخروج</button></div>
    </header>

    {error&&<div className={styles.error}>{error}</div>}

    <section className={styles.metrics}>
      <article><span>كفاءتي</span><strong>{data.performance.technicianScore || '—'}</strong><small>/ 100</small></article>
      <article><span>كفاءة فريقي</span><strong>{data.performance.teamScore || '—'}</strong><small>/ 100</small></article>
      <article><span>بلاغات أنجزتها</span><strong>{data.performance.completedIncidents}</strong><small>بلاغ</small></article>
      <article><span>موقعي</span><strong className={styles.smallValue}>{data.user.locationUpdatedAt?'محدّث':'غير محدّث'}</strong><small>{data.user.locationUpdatedAt?new Date(data.user.locationUpdatedAt).toLocaleTimeString('ar-SA'): 'حدّثه لترشيح أدق'}</small></article>
    </section>

    <section className={styles.teamCard}>
      <div><span className={styles.kicker}>MY FIELD TEAM</span><h2>{membership?.team.name||'لم يتم ربطك بفريق'}</h2><p>{membership?.team.site.name} {membership?.team.zone?`· ${membership.team.zone.name}`:''} · {membership?.team.specialization}</p></div>
      <div className={styles.skills}>{membership?.team.skills.map(s=><span key={s}>{s}</span>)}</div>
    </section>

    <section className={styles.section}>
      <div className={styles.sectionTitle}><div><span className={styles.kicker}>ACTIVE ASSIGNMENTS</span><h2>بلاغات فريقي الآن</h2></div><span className={styles.count}>{active.length}</span></div>
      {active.length===0?<div className={styles.empty}>لا يوجد بلاغ نشط لفريقك حاليًا.</div>:active.map(({d})=><article className={styles.incident} key={d.id}>
        <div className={styles.incidentTop}><div><div className={styles.code}>{d.incident.code} · {d.incident.severity}</div><h3>{d.incident.title}</h3><p>{d.incident.description}</p></div><div className={styles.status}>{d.status}</div></div>
        <div className={styles.facts}><span>الموقع <b>{d.incident.site.name}{d.incident.zone?` / ${d.incident.zone.name}`:''}</b></span><span>SLA <b>{d.incident.slaMinutes} دقيقة</b></span><span>المسافة عند الإسناد <b>{d.distanceKm.toFixed(2)} كم</b></span><span>ETA <b>{d.etaMinutes} د</b></span></div>
        <div className={styles.timeline}><div className={d.status==='ACCEPTED'||d.status==='DISPATCHED'||d.status==='ARRIVED'?styles.done:''}>تم الإسناد</div><div className={d.status==='DISPATCHED'||d.status==='ARRIVED'?styles.done:''}>في الطريق</div><div className={d.status==='ARRIVED'?styles.done:''}>في الموقع</div><div>تم الحل</div></div>
        <div className={styles.actions}>
          {d.status==='ACCEPTED'&&<button onClick={()=>action(d.id,'start')} disabled={!!busy}>بدء التوجه للموقع</button>}
          {d.status==='DISPATCHED'&&<button onClick={()=>action(d.id,'arrive')} disabled={!!busy}>وصلت إلى الموقع</button>}
          {d.status==='ARRIVED'&&<button onClick={()=>setResolving(d.id)}>إنهاء البلاغ وتوثيق الحل</button>}
        </div>
        {resolving===d.id&&<div className={styles.resolveBox}>
          <h4>توثيق الحل والدليل</h4><label>ملخص ما تم إصلاحه<textarea value={summary} onChange={e=>setSummary(e.target.value)} placeholder="مثال: تم تحديد قاطع تالف واستبداله ثم اختبار الحمل..."/></label>
          <label>الإجراءات المنفذة — كل إجراء في سطر<textarea value={actions} onChange={e=>setActions(e.target.value)}/></label>
          <label>الدليل — رابط صورة/مستند/مرجع لكل سطر<textarea value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="https://..."/></label>
          <div className={styles.resolveActions}><button onClick={()=>resolve(d.id)} disabled={!summary.trim()||!evidence.trim()||!!busy}>تأكيد الحل وحساب الكفاءة</button><button className={styles.ghost} onClick={()=>setResolving(null)}>إلغاء</button></div>
        </div>}
      </article>)}
    </section>

    <section className={styles.explain}>
      <span className={styles.kicker}>EXPLAINABLE EFFICIENCY</span><h2>كيف يحسب النظام الكفاءة؟</h2>
      <div className={styles.scoreGrid}><div><b>30%</b><span>الالتزام بزمن SLA</span></div><div><b>20%</b><span>سرعة بدء الاستجابة</span></div><div><b>20%</b><span>القرب من موقع البلاغ</span></div><div><b>20%</b><span>اكتمال الحل والأدلة</span></div><div><b>10%</b><span>جاهزية الفريق وحمله</span></div></div>
      <p>الموقع لا يعطي الموظف صلاحية اختيار البلاغ. مركز العمليات يظل صاحب الإسناد، ومحرك الترشيح يستخدم الموقع والمهارات والجاهزية لاختيار أقرب فريق مؤهل.</p>
    </section>
  </main>;
}
