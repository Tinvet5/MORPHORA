import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const workerSource=await readFile(new URL('./worker.js',import.meta.url),'utf8');
const {default:worker}=await import('data:text/javascript;base64,'+Buffer.from(workerSource).toString('base64'));
const project='https://fvrrkbbumznbhovaoxul.supabase.co';
const uuid='123e4567-e89b-42d3-a456-426614174000';
const other='223e4567-e89b-42d3-a456-426614174111';
const keys=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);
jwk.kid='test-kid';jwk.alg='ES256';
globalThis.fetch=async url=>{assert.equal(url,project+'/auth/v1/.well-known/jwks.json');return new Response(JSON.stringify({keys:[jwk]}),{status:200,headers:{'content-type':'application/json'}});};
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
async function token({sub=uuid,exp=Math.floor(Date.now()/1000)+3600,iss=project+'/auth/v1',role='authenticated'}={}){
 const body=b64({sub,exp,iss,role,aud:'authenticated',iat:Math.floor(Date.now()/1000)});
 const message=b64({typ:'JWT',alg:'ES256',kid:'test-kid'})+'.'+body;
 const sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,new TextEncoder().encode(message));
 return message+'.'+Buffer.from(sig).toString('base64url');
}
const content='<Image TileSize="512" Format="jpg"><Size Width="21959" Height="59088" /></Image>';
let reads=0;
const env={SUPABASE_URL:project,ALLOWED_USER_IDS:uuid,ALLOWED_ORIGINS:'https://morphora.cl,http://localhost:5500',DEMO_ENABLED:'true',DEMO_ENDS_AT:'2099-10-17T03:00:00Z',HISTOLOGY_BUCKET:{
 get:async key=>{reads++;const data=key==='hueso-4/slide.dzi'?content:key==='hueso-4/slide_files/0/0_0.jpg'?'FAKE_JPEG':null;return data==null?null:{body:data,size:data.length};},
 head:async key=>key==='hueso-4/slide.dzi'?{size:content.length}:null
}};
async function call(path,bearer='',orig='https://morphora.cl',method='GET'){
 const headers={};if(orig)headers.Origin=orig;if(bearer)headers.Authorization='Bearer '+bearer;
 return worker.fetch(new Request('https://gateway.workers.dev'+path,{method,headers}),env);
}
let passed=0;
async function check(path,expected,{bearer='',origin='https://morphora.cl',method='GET'}={}) {
 const r=await call(path,bearer,origin,method);
 assert.equal(r.status,expected,`Unexpected HTTP for ${path}`);passed++;return r;
}
await check('/health',200);
await check('/slides/hueso-4/slide.dzi',401);
await check('/slides/hueso-4/slide.dzi',200,{bearer:await token()});
await check('/slides/hueso-4/slide.dzi',403,{bearer:await token({sub:other})});
await check('/slides/hueso-4/slide.dzi',401,{bearer:await token({exp:123})});
await check('/slides/hueso-4/slide.dzi',401,{bearer:await token({role:'anon'})});
await check('/slides/hueso-4/slide.dzi',401,{bearer:await token({iss:'https://wrong.supabase.co/auth/v1'})});
await check('/slides/hueso-4/slide.dzi',405,{bearer:await token(),origin:'https://morphora.cl',method:'POST'});
await check('/slides/hueso-5/slide.dzi',404,{bearer:await token()});
await check('/demo/slides/hueso-4/slide.dzi',200);
const tile=await check('/demo/slides/hueso-4/slide_files/0/0_0.jpg',200);
assert.equal(tile.headers.get('content-type'),'image/jpeg');
await check('/demo/slides/hueso-4/slide.dzi',200,{method:'HEAD'});
await check('/demo/slides/hueso-4/slide.dzi',403,{origin:'https://unknown.example'});
await check('/demo/slides/hueso-5/slide.dzi',404);
await check('/demo/slides/hueso-4/barcode.jpg',404);
await check('/demo/slides/hueso-4/.morphora-export.json',404);
await check('/demo/slides/hueso-4/slide_files/',404);
await check('/demo/slides/hueso-4/slide.dzi?token=x',404);
await check('/demo/slides/hueso-4/slide.dzi',204,{method:'OPTIONS'});
env.DEMO_ENABLED='false';
await check('/demo/slides/hueso-4/slide.dzi',404);
await check('/slides/hueso-4/slide.dzi',200,{bearer:await token()});
env.DEMO_ENABLED='true';env.DEMO_ENDS_AT='2026-10-10T03:00:00Z';
await check('/demo/slides/hueso-4/slide.dzi',404);
env.DEMO_ENDS_AT='invalid';
await check('/demo/slides/hueso-4/slide.dzi',404);
console.log(`PASS: ${passed} Worker access-control tests; R2 calls=${reads}`);
