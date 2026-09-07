'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const links=[['/dashboard','مركز العمليات'],['/incidents','البلاغات'],['/dispatch','التوجيه الذكي'],['/teams','الفرق'],['/resources','الموارد'],['/inventory','المخزون'],['/reports','التقارير']];
export default function AppShell({children}:{children:React.ReactNode}){
 const router=useRouter(); const path=usePathname();
 useEffect(()=>{if(!localStorage.getItem('madad_access_token')) router.replace('/login')},[router]);
 return <div className="shell"><aside className="sidebar"><div className="brand">مَدَد<small>MADAD · Field Operations Orchestration</small></div><nav className="nav">{links.map(([href,label])=><Link key={href} href={href} style={path===href?{background:'#3b352f',color:'#fff'}:{}}>{label}</Link>)}</nav><div className="spacer"/><button className="btn secondary" onClick={()=>{localStorage.clear();router.replace('/login')}}>تسجيل الخروج</button></aside><main className="content">{children}</main></div>
}
