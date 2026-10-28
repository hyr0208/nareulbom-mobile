import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { symmetricDecrypt, symmetricEncrypt } from 'better-auth/crypto';
import { authSettings, makeAuth, createAuthRuntime, revokeProvider } from './auth.mjs';
const env={AUTH_BASE_URL:'http://localhost:8788',BETTER_AUTH_SECRET:'test-only-strong-secret-012345678901234567890',DATABASE_URL:'not-used',KAKAO_CLIENT_ID:'test-kakao',KAKAO_CLIENT_SECRET:'test-secret'};
const origin='http://localhost:8081';
let nextClient=1;
function setup(revoke=async()=>{}) {
  const ip=`127.0.0.${nextClient++}`;
  const db={user:[],session:[],account:[],verification:[]};
  const {auth}=makeAuth({database:memoryAdapter(db),env,revoke});
  const request=(path,body,cookie)=>auth.handler(new Request(`${env.AUTH_BASE_URL}/api/auth${path}`,{method:body===undefined?'GET':'POST',headers:{Origin:origin,'X-Forwarded-For':ip,...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}));
  return {auth,db,request};
}
function cookie(response) {return response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');}
async function start(t) {
  const r=await t.request('/sign-in/social',{provider:'kakao',callbackURL:origin+'/auth-return',additionalData:{accountConsentVersion:'2026-10-27'}});
  assert.equal(r.status,200);const data=await r.json();return {state:new URL(data.url).searchParams.get('state'),cookie:cookie(r),url:data.url};
}
async function complete(t,{id=123,error=false}={}) {
  const pending=await start(t);
  const original=globalThis.fetch;
  globalThis.fetch=async (url)=>{
    const target=String(url);
    if(target==='https://kauth.kakao.com/oauth/token')return Response.json({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600,token_type:'bearer'});
    if(target==='https://kapi.kakao.com/v2/user/me')return Response.json({id,kakao_account:{email:'same@example.test',is_email_verified:true,profile:{nickname:'Must not store',profile_image_url:'https://example.test/private.png'}}});
    throw new Error('Unexpected outbound request');
  };
  try {const r=await t.request(`/callback/kakao?state=${pending.state}&${error?'error=access_denied':'code=fixture-code'}`,undefined,pending.cookie);return {response:r,cookie:cookie(r),state:pending.state,stateCookie:pending.cookie};}
  finally {globalThis.fetch=original;}
}
test('authentication stays disabled with absent/weak secrets, unsafe URLs or missing DB',async()=>{
  assert.equal(authSettings({}).enabled,false);assert.equal(authSettings({...env,BETTER_AUTH_SECRET:'short'}).enabled,false);assert.equal(authSettings({...env,DATABASE_URL:''}).enabled,false);
  assert.equal(authSettings({...env,NODE_ENV:'production'}).enabled,false);assert.equal(authSettings({...env,AUTH_BASE_URL:'https://user:pass@example.test'}).enabled,false);
  assert.equal(authSettings({...env,NODE_ENV:'production',AUTH_BASE_URL:'https://api.example.test'}).enabled,true);
  const runtime=await createAuthRuntime({});assert.deepEqual(await runtime.status(),{ready:false,kakao:false,apple:false,consentVersion:'2026-10-27'});
});
test('login requires account notice and rejects ID-token bypass and untrusted return URLs',async()=>{
  const t=setup();assert.equal((await t.request('/sign-in/social',{provider:'kakao'})).status,400);
  assert.equal((await t.request('/sign-in/social',{provider:'kakao',idToken:{token:'fake'},additionalData:{accountConsentVersion:'2026-10-27'}})).status,400);
  const r=await t.request('/sign-in/social',{provider:'kakao',callbackURL:'https://evil.example',additionalData:{accountConsentVersion:'2026-10-27'}});assert.ok(r.status>=400);
  assert.equal(t.db.user.length,0);
});
test('Kakao authorization is state-bound and requests no email or profile scopes',async()=>{
  const t=setup();const pending=await start(t);const url=new URL(pending.url);
  assert.ok(pending.state);assert.equal(url.searchParams.has('scope'),false);assert.equal(url.searchParams.get('redirect_uri'),env.AUTH_BASE_URL+'/api/auth/callback/kakao');
  const invalid=await t.request('/callback/kakao?state=not-our-state&code=fixture');assert.ok(invalid.status>=300);assert.equal(t.db.user.length,0);assert.equal(t.db.session.length,0);
});
test('verified provider identity creates minimal account, encrypted provider tokens and server session',async()=>{
  const t=setup();const done=await complete(t);assert.equal(done.response.status,302);assert.equal(new URL(done.response.headers.get('location')).pathname,'/auth-return');
  assert.equal(t.db.user.length,1);assert.equal(t.db.account.length,1);assert.equal(t.db.session.length,1);
  const user=t.db.user[0];assert.equal(user.name,'나를봄 회원');assert.match(user.email,/@identity.invalid$/);assert.ok(user.accountConsentAt);assert.equal(user.accountConsentVersion,'2026-10-27');
  assert.equal(t.db.account[0].idToken,null);assert.equal(t.db.session[0].ipAddress,null);assert.equal(t.db.session[0].userAgent,null);
  const stored=JSON.stringify(t.db);assert.equal(stored.includes('same@example.test'),false);assert.equal(stored.includes('Must not store'),false);assert.equal(stored.includes('test-access'),false);assert.equal(stored.includes('test-refresh'),false);
  const context=await t.auth.$context;assert.equal(await symmetricDecrypt({key:context.secretConfig,data:t.db.account[0].refreshToken}),'test-refresh');
  const session=await t.request('/get-session',undefined,done.cookie);assert.equal(session.status,200);assert.equal((await session.json()).user.id,user.id);
});
test('callback replay/cancellation cannot issue another session or provision a member',async()=>{
  const t=setup();const done=await complete(t);const count=t.db.session.length;
  const replay=await t.request(`/callback/kakao?state=${done.state}&code=replay`,undefined,done.stateCookie);assert.ok(replay.status>=300);assert.equal(t.db.session.length,count);
  const cancelled=setup();await complete(cancelled,{error:true});assert.equal(cancelled.db.user.length,0);assert.equal(cancelled.db.session.length,0);
});
test('identical provider email does not merge different subjects and returning identity uses the original member',async()=>{
  const t=setup();await complete(t,{id:1});await complete(t,{id:2});assert.equal(t.db.user.length,2);await complete(t,{id:1});assert.equal(t.db.user.length,2);
});
test('logout invalidates the session without deleting the account',async()=>{
  const t=setup();const done=await complete(t);assert.equal((await t.request('/sign-out',{},done.cookie)).status,200);
  assert.equal(await (await t.request('/get-session',undefined,done.cookie)).json(),null);assert.equal(t.db.user.length,1);
});
test('deletion requires a fresh session; provider failure retains account and sessions for retry',async()=>{
  let fail=true;let revocations=0;const t=setup(async()=>{revocations++;if(fail)throw Error('test provider outage');});const done=await complete(t);
  const rejected=await t.request('/delete-user',{},done.cookie);assert.equal(rejected.status,503);assert.equal(t.db.user.length,1);assert.equal(t.db.session.length,1);
  fail=false;t.db.session[0].createdAt=new Date(Date.now()-11*60*1000);
  assert.equal((await t.request('/delete-user',{},done.cookie)).status,400);assert.equal(revocations,1);
  t.db.session[0].createdAt=new Date();assert.equal((await t.request('/delete-user',{},done.cookie)).status,200);assert.equal(t.db.user.length,0);assert.equal(t.db.account.length,0);assert.equal(t.db.session.length,0);
  assert.equal(await (await t.request('/get-session',undefined,done.cookie)).json(),null);
});
test('Kakao unlink decrypts on server only and treats invalid refresh grant as already revoked',async()=>{
  const secret=env.BETTER_AUTH_SECRET;const accessToken=await symmetricEncrypt({key:secret,data:'fixture-access'});const refreshToken=await symmetricEncrypt({key:secret,data:'fixture-refresh'});let called=0;
  await revokeProvider({providerId:'kakao',accessToken,refreshToken,accessTokenExpiresAt:new Date(Date.now()+60000)},{secret,env,fetcher:async(url,options)=>{called++;assert.equal(url,'https://kapi.kakao.com/v1/user/unlink');assert.equal(options.headers.Authorization,'Bearer fixture-access');return Response.json({id:1});}});assert.equal(called,1);
  await revokeProvider({providerId:'kakao',refreshToken},{secret,env,fetcher:async(url)=>{assert.equal(url,'https://kauth.kakao.com/oauth/token');return Response.json({error:'invalid_grant'},{status:400});}});
  await assert.rejects(()=>revokeProvider({providerId:'kakao',accessToken,accessTokenExpiresAt:new Date(Date.now()+60000)},{secret,env,fetcher:async()=>Response.json({error:'unavailable'},{status:503})}));
});

test('Apple client secret and token revocation use the configured service identity and signed server key',async()=>{
  const {generateKeyPair,jwtVerify}=await import('jose');const {mkdtempSync,writeFileSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
  const keys=await generateKeyPair('ES256',{extractable:true});const {exportPKCS8}=await import('jose');const dir=mkdtempSync(join(tmpdir(),'nareulbom-auth-'));const path=join(dir,'test-only.p8');writeFileSync(path,await exportPKCS8(keys.privateKey),{mode:0o600});
  const appleEnv={...env,APPLE_CLIENT_ID:'test.service',APPLE_TEAM_ID:'TEAMTEST',APPLE_KEY_ID:'KEYTEST',APPLE_PRIVATE_KEY_PATH:path};const secret=env.BETTER_AUTH_SECRET;const token=await symmetricEncrypt({key:secret,data:'test-apple-refresh'});
  try {
    await revokeProvider({providerId:'apple',refreshToken:token},{env:appleEnv,secret,fetcher:async(url,options)=>{
      assert.equal(url,'https://appleid.apple.com/auth/revoke');assert.equal(options.body.get('token'),'test-apple-refresh');assert.equal(options.body.get('token_type_hint'),'refresh_token');assert.equal(options.body.get('client_id'),'test.service');
      const verified=await jwtVerify(options.body.get('client_secret'),keys.publicKey,{issuer:'TEAMTEST',audience:'https://appleid.apple.com',subject:'test.service'});assert.equal(verified.protectedHeader.kid,'KEYTEST');assert.ok(verified.payload.exp-verified.payload.iat<=86400);return Response.json({});
    }});
  } finally {rmSync(dir,{recursive:true,force:true});}
});

test('native app return URLs work while provider token HTTP routes are not needed by clients',async()=>{
  const t=setup();const r=await t.request('/sign-in/social',{provider:'kakao',callbackURL:'nareulbom://auth-return',additionalData:{accountConsentVersion:'2026-10-27'}});assert.equal(r.status,200);assert.equal(t.db.user.length,0);
});
