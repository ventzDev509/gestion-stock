import type { Product, StockMovement } from '../types'
export const quantityOf=(p:Product,ms:StockMovement[])=>ms.length===0&&p.currentStock!==undefined?p.currentStock:p.initialStock+ms.filter(m=>m.productId===p.id&&m.type==='ENTREE').reduce((n,m)=>n+m.quantity,0)-ms.filter(m=>m.productId===p.id&&m.type==='SORTIE').reduce((n,m)=>n+m.quantity,0)
export const statusOf=(p:Product,q:number):'OK'|'COMMANDER'|'RUPTURE'=>q===0?'RUPTURE':q<=p.minAlertThreshold?'COMMANDER':'OK'
export const money=(value:number,currency:string)=>new Intl.NumberFormat('fr-HT',{style:'currency',currency,maximumFractionDigits:0}).format(value)
export const csv=(rows:string[][])=>'\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(';')).join('\r\n')
export const download=(name:string,content:string,type:string)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
