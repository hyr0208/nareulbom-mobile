import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.mjs';
import { createAuthRuntime } from './auth.mjs';
async function serve(runtime,action) {
  const app=createApp({authRuntime:runtime});app.listen(0,'127.0.0.1');await once(app,'listening');
  try {await action(`http://127.0.0.1:${app.address().port}`);}finally {app.closeAllConnections();await new Promise(resolve=>app.close(resolve));}
}
test('missing auth settings report unavailability without blocking public drug search',async()=>{
  await serve(await createAuthRuntime({}),async base=>{
    const config=await (await fetch(base+'/api/auth-config')).json();assert.equal(config.ready,false);assert.equal(config.kakao,false);assert.equal(Object.hasOwn(config,'secret'),false);
    const denied=await fetch(base+'/api/auth/sign-in/social',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,503);
    assert.equal((await fetch(base+'/health')).status,200);
  });
});
test('native/web preflight permits required headers and oversized auth requests are rejected before handling',async()=>{
  let called=0;await serve({configured:true,status:async()=>({ready:true}),handler:async()=>{called++;}},async base=>{
    const options=await fetch(base+'/api/auth/sign-in/social',{method:'OPTIONS'});assert.equal(options.status,204);assert.equal(options.headers.get('access-control-allow-credentials'),'true');assert.match(options.headers.get('access-control-allow-headers'),/Expo-Origin/);
    const huge=await fetch(base+'/api/auth/sign-in/social',{method:'POST',body:'x'.repeat(17000)});assert.equal(huge.status,413);assert.equal(called,0);
  });
});
test('provider token retrieval and account-linking endpoints are not exposed by the Node wrapper',async()=>{
  const runtime=await createAuthRuntime({AUTH_BASE_URL:'http://localhost:8788',DATABASE_URL:'postgres://unused:unused@localhost:1/unused',BETTER_AUTH_SECRET:'test-secret-not-used-01234567890123456789'});
  try {await serve(runtime,async base=>{for(const path of ['/get-access-token','/link-social','/update-user','/delete-user/callback'])assert.equal((await fetch(base+'/api/auth'+path,{method:'POST',body:'{}'})).status,404);});}
  finally {await runtime.pool.end();}
});
