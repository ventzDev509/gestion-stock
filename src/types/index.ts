export const defaultCategories = ['Électronique','Accessoires','Bureau','Alimentaire','Nettoyage','Autre'] as const
export const units = ['Pièce','Boîte','Sac','Bouteille','Gallon','Kg','Litre'] as const
export type Category = string
export type Unit = typeof units[number]
export interface Product { id:string; code:string; name:string; category:Category; unit:Unit; initialStock:number; minAlertThreshold:number; purchasePrice:number; sellingPrice:number; supplier:string; createdAt:string; currentStock?:number }
export interface StockMovement { id:string; reference:string; date:string; productId:string; type:'ENTREE'|'SORTIE'; quantity:number; unitPrice:number; note:string }
export interface Backup { version:number; exportedAt:string; products:Product[]; movements:StockMovement[]; currency:string; categories?:string[] }
export interface PendingStockAlert { eventId:string; occurredAt:string; products:{name:string;code:string;unit:string;currentStock:0;threshold:number}[] }
export const permissions = ['products.view','products.create','products.update','products.delete','movements.view','movements.create','categories.manage','backups.manage'] as const
export type Permission = typeof permissions[number]
export interface AdminUser { id:string; name:string; email:string; role:'SUPER_ADMIN'|'ADMIN'; permissions:Permission[]; passwordHash:string; passwordSalt:string; createdAt:string; updatedAt:string }
export type AdminProfile = Omit<AdminUser,'passwordHash'|'passwordSalt'>
export interface PendingMutation { id:string; method:'POST'|'PATCH'|'DELETE'|'PUT'; path:string; body?:unknown; createdAt:string }
export interface AuditLogEntry { id:string; actorId:string; actorName:string; actorEmail:string; action:string; details:string; createdAt:string }
