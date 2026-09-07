const BASE=process.env.NEXT_PUBLIC_API_URL||'http://localhost:4000/api/v1';
export const token=()=>typeof window==='undefined'?null:localStorage.getItem('madad_token');
export function setToken(v:string){localStorage.setItem('madad_token',v)} export function clearToken(){localStorage.removeItem('madad_token')}
export async function api<T=any>(path:string,opts:RequestInit={}){const t=token();const r=await fetch(BASE+path,{...opts,headers:{'Content-Type':'application/json',...(t?{Authorization:`Bearer ${t}`}:{ }),...(opts.headers||{})},cache:'no-store'});if(r.status===401&&typeof window!=='undefined'){clearToken();if(location.pathname!=='/login')location.href='/login'}if(!r.ok){const e=await r.json().catch(()=>({}));throw new Error(e.error||`HTTP ${r.status}`)}return r.json() as Promise<T>}
