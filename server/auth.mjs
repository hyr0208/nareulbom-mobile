import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { betterAuth } from 'better-auth';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { symmetricDecrypt } from 'better-auth/crypto';
import { toNodeHandler } from 'better-auth/node';
import { expo } from '@better-auth/expo';
import { Pool } from 'pg';
import { importPKCS8, SignJWT } from 'jose';
export const ACCOUNT_CONSENT_VERSION = '2026-10-27';
const allowed = new Set(['/get-session','/sign-in/social','/sign-out','/delete-user','/callback/kakao','/callback/apple','/expo-authorization-proxy']);
export function authSettings(env = process.env) {
  const url = env.AUTH_BASE_URL || '';
  let validURL = false;
  try { const parsed = new URL(url); validURL = parsed.pathname === '/' && !parsed.username && !parsed.password && !parsed.search && !parsed.hash && (parsed.protocol === 'https:' || (env.NODE_ENV !== 'production' && parsed.protocol === 'http:' && ['localhost','127.0.0.1'].includes(parsed.hostname))); } catch {}
  const enabled = Boolean(env.DATABASE_URL && env.BETTER_AUTH_SECRET?.length >= 32 && validURL);
  return {enabled,baseURL:url,secret:env.BETTER_AUTH_SECRET,
    kakao:enabled && Boolean(env.KAKAO_CLIENT_ID && env.KAKAO_CLIENT_SECRET),
    apple:enabled && Boolean(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY_PATH),
  };
}
function privateProfile(provider, subject) {
  if (!subject || !['string','number'].includes(typeof subject)) throw new Error('Invalid provider subject');
  return {name:'나를봄 회원',email:`${createHash('sha256').update(`${provider}:${subject}`).digest('hex')}@identity.invalid`,emailVerified:false,image:null};
}
export async function appleSecret(env) {
  const key = await importPKCS8(readFileSync(env.APPLE_PRIVATE_KEY_PATH,'utf8'),'ES256');
  return new SignJWT({}).setProtectedHeader({alg:'ES256',kid:env.APPLE_KEY_ID}).setIssuer(env.APPLE_TEAM_ID).setSubject(env.APPLE_CLIENT_ID).setAudience('https://appleid.apple.com').setIssuedAt().setExpirationTime('1d').sign(key);
}
export function authOptions({database,env = process.env,revoke,providers} = {}) {
  const config = authSettings(env);
  const socialProviders = providers || {
    ...(config.kakao ? {kakao:{clientId:env.KAKAO_CLIENT_ID,clientSecret:env.KAKAO_CLIENT_SECRET,disableDefaultScope:true,scope:[],mapProfileToUser:profile => privateProfile('kakao',profile.id)}} : {}),
    ...(config.apple ? {apple:async () => ({clientId:env.APPLE_CLIENT_ID,clientSecret:await appleSecret(env),disableDefaultScope:true,scope:[],mapProfileToUser:profile => privateProfile('apple',profile.sub)})} : {}),
  };
  return {
    appName:'나를봄',database,baseURL:config.baseURL,basePath:'/api/auth',secret:config.secret,
    trustedOrigins:[env.CORS_ORIGIN || 'http://localhost:8081','nareulbom://',...(config.apple ? ['https://appleid.apple.com'] : [])],
    socialProviders,plugins:[expo()],emailAndPassword:{enabled:false},logger:{disabled:true},
    session:{expiresIn:60*60*24*7,updateAge:60*60*24,freshAge:60*10,cookieCache:{enabled:false}},
    account:{encryptOAuthTokens:true,accountLinking:{enabled:false,disableImplicitLinking:true},storeStateStrategy:'database'},
    rateLimit:{enabled:true,window:60,max:60,customRules:{'/sign-in/social':{window:60,max:10}}},
    advanced:{cookiePrefix:'nareulbom',useSecureCookies:env.NODE_ENV === 'production'},
    databaseHooks:{
      account:{create:{before:async account => ({data:{...account,idToken:null}})},update:{before:async account => ({data:{...account,idToken:null}})}},
      session:{create:{before:async session => ({data:{...session,ipAddress:null,userAgent:null}})}},
    },
    user:{additionalFields:{accountConsentVersion:{type:'string',input:false,defaultValue:ACCOUNT_CONSENT_VERSION},accountConsentAt:{type:'date',input:false,defaultValue:() => new Date()}},deleteUser:{enabled:true,beforeDelete:revoke}},
    hooks:{before:createAuthMiddleware(async ctx => {
      if (ctx.path === '/sign-in/social') {
        if (ctx.body?.additionalData?.accountConsentVersion !== ACCOUNT_CONSENT_VERSION) throw new APIError('BAD_REQUEST',{code:'ACCOUNT_CONSENT_REQUIRED',message:'계정 정보 이용 안내를 확인해 주세요.'});
        // Use the framework's state-bound authorization-code flow for both providers.
        if (ctx.body?.idToken || ctx.body?.requestSignUp === false) throw new APIError('BAD_REQUEST',{message:'지원하지 않는 로그인 방식이에요.'});
      }
    })},
  };
}
async function providerRequest(url,body,fetcher) {
  const response = await fetcher(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body),signal:AbortSignal.timeout(10000)});
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (data.error === 'invalid_grant') return {revoked:true};
    throw new Error('Provider request failed');
  }
  return data;
}
export async function revokeProvider(account,{secret,env = process.env,fetcher = fetch} = {}) {
  const decode = token => token ? symmetricDecrypt({key:secret,data:token}) : null;
  if (account.providerId === 'apple') {
    const token = await decode(account.refreshToken || account.accessToken);
    if (!token) throw new Error('Missing provider token');
    await providerRequest('https://appleid.apple.com/auth/revoke',{client_id:env.APPLE_CLIENT_ID,client_secret:await appleSecret(env),token,token_type_hint:account.refreshToken ? 'refresh_token' : 'access_token'},fetcher);
  } else if (account.providerId === 'kakao') {
    let token = await decode(account.accessToken);
    if (!token || !account.accessTokenExpiresAt || new Date(account.accessTokenExpiresAt).getTime() <= Date.now()) {
      const refresh = await decode(account.refreshToken);
      if (!refresh) throw new Error('Missing provider token');
      const refreshed = await providerRequest('https://kauth.kakao.com/oauth/token',{grant_type:'refresh_token',client_id:env.KAKAO_CLIENT_ID,client_secret:env.KAKAO_CLIENT_SECRET,refresh_token:refresh},fetcher);
      if (refreshed.revoked) return;
      token = refreshed.access_token;
    }
    if (!token) throw new Error('Missing access token');
    const response = await fetcher('https://kapi.kakao.com/v1/user/unlink',{method:'POST',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});
    if (!response.ok) throw new Error('Unlink failed');
  } else throw new Error('Unsupported provider');
}
export function makeAuth({database,env = process.env,revoke = revokeProvider,providers} = {}) {
  let auth;
  const options = authOptions({database,env,providers,revoke:async user => {
    const context = await auth.$context;
    const accounts = await context.internalAdapter.findAccounts(user.id);
    try { for (const account of accounts) await revoke(account,{secret:context.secretConfig,env}); }
    catch { throw new APIError('SERVICE_UNAVAILABLE',{code:'ACCOUNT_UNLINK_FAILED',message:'로그인 연결 해제를 완료하지 못했어요. 다시 로그인한 뒤 탈퇴를 재시도해 주세요.'}); }
  }});
  auth = betterAuth(options);
  return {auth,options};
}
export async function createAuthRuntime(env = process.env) {
  const config = authSettings(env);
  if (!config.enabled) return {configured:false,status:async () => ({ready:false,kakao:false,apple:false,consentVersion:ACCOUNT_CONSENT_VERSION})};
  const pool = new Pool({connectionString:env.DATABASE_URL,max:5,connectionTimeoutMillis:3000,idleTimeoutMillis:30000});
  pool.on('error',() => {}); // Never include connection strings or provider tokens in logs.
  const {auth,options} = makeAuth({database:pool,env});
  const nodeHandler = toNodeHandler(auth);
  async function status() {
    try { await pool.query('SELECT "accountConsentVersion" FROM "user", "session", "account", "verification" LIMIT 0'); return {ready:true,kakao:config.kakao,apple:config.apple,consentVersion:ACCOUNT_CONSENT_VERSION}; }
    catch { return {ready:false,kakao:false,apple:false,consentVersion:ACCOUNT_CONSENT_VERSION}; }
  }
  return {configured:true,auth,options,pool,status,handler:async (request,response) => {
    const path = new URL(request.url,'http://localhost').pathname.slice('/api/auth'.length);
    if (!allowed.has(path)) { response.writeHead(404);response.end(JSON.stringify({message:'지원하지 않는 인증 요청이에요.'}));return; }
    await nodeHandler(request,response);
  }};
}
