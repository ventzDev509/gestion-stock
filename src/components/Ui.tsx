import type { ReactNode } from 'react'
import { Package } from 'lucide-react'

export function Kpi({icon,label,value,note,tone}:{icon:ReactNode;label:string;value:string;note:string;tone:string}){return <div className="panel kpi-card"><div className={`kpi-icon ${tone}`}>{icon}</div><span className="kpi-label">{label}</span><strong>{value}</strong><small>{note}</small></div>}
export function Status({value}:{value:'OK'|'COMMANDER'|'RUPTURE'}){return <span className={`status-pill ${value.toLowerCase()}`}><i/>{value==='OK'?'En stock':value==='COMMANDER'?'À commander':'Rupture'}</span>}
export function Empty({message}:{message:string}){return <div className="empty-state"><Package size={26}/><p>{message}</p></div>}
