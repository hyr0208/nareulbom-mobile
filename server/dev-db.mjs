// Project-local development cluster only. No health data is sent to this database.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';
import pg from 'pg';
if (process.env.NODE_ENV === 'production') throw new Error('개발용 DB는 운영에서 실행할 수 없습니다.');
const dataDir = fileURLToPath(new URL('./data/',import.meta.url));
const configPath = dataDir+'dev-db.json';
const envPath = fileURLToPath(new URL('../.env',import.meta.url));
mkdirSync(dataDir,{recursive:true,mode:0o700});
const envText=existsSync(envPath)?readFileSync(envPath,'utf8'):'';
const existing=envText.match(/^DATABASE_URL[ \t]*=[ \t]*(.*)$/m)?.[1]?.trim();
if (existing && !existing.startsWith('postgresql://nareulbom_app:') ) throw new Error('기존 DATABASE_URL을 유지합니다. 외부 DB가 설정되어 있어 개발 DB를 시작하지 않습니다.');
let config;
if (existsSync(configPath)) config=JSON.parse(readFileSync(configPath,'utf8'));
else {
  if (existing) throw new Error('개발 DB 설정 파일이 없습니다. 기존 DB 주소를 덮어쓰지 않습니다.');
  config={port:55432,adminPassword:randomBytes(36).toString('base64url'),appPassword:randomBytes(36).toString('base64url')};
  writeFileSync(configPath,JSON.stringify(config),{mode:0o600});
}
if (![config.adminPassword,config.appPassword].every(value=>typeof value==='string' && /^[A-Za-z0-9_-]{48}$/.test(value)) || config.port!==55432) throw new Error('개발 DB 설정을 확인할 수 없습니다.');
const connection=`postgresql://nareulbom_app:${config.appPassword}@127.0.0.1:55432/nareulbom`;
if(existing && existing!==connection)throw new Error('개발 DB 설정과 기존 DATABASE_URL이 다릅니다. 덮어쓰지 않습니다.');
const cluster=new EmbeddedPostgres({databaseDir:dataDir+'postgres',port:config.port,user:'nareulbom_admin',password:config.adminPassword,authMethod:'scram-sha-256',persistent:true,createPostgresUser:false,initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1','-c','log_statement=none'],onLog:()=>{},onError:()=>{}});
let running=false;
async function stop(){if(running){running=false;await cluster.stop();}process.exit(0);}
process.on('SIGINT',()=>void stop());process.on('SIGTERM',()=>void stop());
try {
  if(!existsSync(dataDir+'postgres/PG_VERSION'))await cluster.initialise();
  await cluster.start();running=true;
  const admin=new pg.Client({host:'127.0.0.1',port:config.port,user:'nareulbom_admin',password:config.adminPassword,database:'postgres'});await admin.connect();
  try {
    if(!(await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',['nareulbom_app'])).rowCount) await admin.query(`CREATE ROLE nareulbom_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${config.appPassword}'`);
    if(!(await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',['nareulbom'])).rowCount) await admin.query('CREATE DATABASE nareulbom OWNER nareulbom_app');
  } finally {await admin.end();}
  if(!existing) {
    const latest=readFileSync(envPath,'utf8');
    // Refuse to overwrite edits made while PostgreSQL was initializing.
    const current=latest.match(/^DATABASE_URL[ \t]*=[ \t]*(.*)$/m)?.[1]?.trim();
    if(current)throw new Error('DATABASE_URL이 변경됐어요. 기존 설정을 확인해 주세요.');
    writeFileSync(envPath,/^DATABASE_URL\s*=/m.test(latest)?latest.replace(/^DATABASE_URL\s*=.*$/m,'DATABASE_URL='+connection):latest+'\nDATABASE_URL='+connection+'\n',{mode:0o600});
  }
  console.log('나를봄 개발용 PostgreSQL 준비 완료 · 127.0.0.1:55432 · Ctrl+C로 종료');
  // PostgreSQL child process keeps this development session alive.
} catch {
  console.error('개발용 PostgreSQL을 시작하지 못했습니다. 포트·프로젝트 쓰기 권한을 확인하세요. 비밀번호는 출력하지 않습니다.');
  if(running)await cluster.stop();process.exitCode=1;
}
