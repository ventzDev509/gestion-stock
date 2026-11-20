import type { AdminProfile, AdminUser } from '../types'

const ITERATIONS = 310_000
const encode = (bytes:Uint8Array) => btoa(String.fromCharCode(...bytes))
const decode = (text:string) => Uint8Array.from(atob(text),c=>c.charCodeAt(0))

export async function hashPassword(password:string,saltText?:string){
 const salt=saltText?decode(saltText):crypto.getRandomValues(new Uint8Array(16))
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits'])
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},key,256)
 return {passwordSalt:encode(salt),passwordHash:encode(new Uint8Array(bits))}
}
export async function verifyPassword(password:string,user:Pick<AdminUser,'passwordSalt'|'passwordHash'>){
 const computed=await hashPassword(password,user.passwordSalt)
 const a=decode(computed.passwordHash),b=decode(user.passwordHash)
 if(a.length!==b.length)return false
 let mismatch=0
 for(let i=0;i<a.length;i++)mismatch|=a[i]^b[i]
 return mismatch===0
}
export function publicProfile(user:AdminUser):AdminProfile{return{id:user.id,name:user.name,email:user.email,role:user.role,permissions:user.permissions,createdAt:user.createdAt,updatedAt:user.updatedAt}}
