import test from 'node:test';
import assert from 'node:assert/strict';
import { createVault } from './vault-core.ts';
import { parseRegimen, restoreSnapshot, savedMedicine } from './medicine-model.ts';
function memoryStore() {
  const values = new Map();
  const store = { get: async key => values.get(key) ?? null, set: async (key,value) => { values.set(key,value); }, remove: async key => { values.delete(key); } };
  return { values, store };
}
test('encrypted-store adapter chunks unicode payloads and restores after a new instance', async () => {
  const {store,values}=memoryStore(); const value={text:'한글🌿'.repeat(1500)};
  await createVault(store).write(value);
  for(const data of values.values()) assert.ok(Buffer.byteLength(data,'utf8')<=1500);
  assert.deepEqual(await createVault(store).read(),value);
});
test('interrupted staged write preserves the previous committed snapshot', async () => {
  const {store}=memoryStore();const vault=createVault(store);await vault.write({version:'previous'});
  const original=store.set;store.set=async (key,value)=>{if(key.endsWith('.b.1'))throw new Error('disk full');await original(key,value);};
  await assert.rejects(vault.write({text:'x'.repeat(3000)}));
  assert.deepEqual(await createVault(store).read(),{version:'previous'});
  store.set=original;await vault.write({version:'next'});assert.deepEqual(await vault.read(),{version:'next'});
});
test('missing snapshot chunks are errors, never silently treated as an empty list', async () => {
  const {store,values}=memoryStore();const vault=createVault(store);await vault.write({text:'x'.repeat(3000)});
  values.delete('nareulbom.v1.a.1');await assert.rejects(vault.read());
});
test('cleanup failure reports the committed state and whole deletion clears both banks', async () => {
  const {store,values}=memoryStore();const vault=createVault(store);await vault.write({old:true});
  const remove=store.remove;store.remove=async key=>{if(key.endsWith('.a.0'))throw new Error('locked');await remove(key);};
  assert.equal((await vault.write({new:true})).cleanupPending,true);assert.deepEqual(await vault.read(),{new:true});
  store.remove=remove;await vault.clear();assert.equal(values.size,0);assert.equal(await vault.read(),null);
});
test('interrupted deletion cannot reload health information and can be retried', async () => {
  const {store,values}=memoryStore();const vault=createVault(store);await vault.write({private:true});
  const remove=store.remove;store.remove=async ()=>{throw new Error('locked');};
  await assert.rejects(vault.clear());await assert.rejects(createVault(store).read());await assert.rejects(vault.write({new:true}));
  store.remove=remove;await createVault(store).clear();assert.equal(values.size,0);
});
test('regimen validates manual dose, time format, uniqueness and as-needed mode', () => {
  assert.deepEqual(parseRegimen('  1정  ','daily','20:00, 08:00'),{dose:'1정',mode:'daily',times:['08:00','20:00']});
  for(const input of ['', '24:00', '8:00', '09:60','08:00, 08:00'])assert.throws(()=>parseRegimen('1정','daily',input));
  assert.throws(()=>parseRegimen('','daily','08:00'));
  assert.deepEqual(parseRegimen('확인한 복용량','asNeeded','08:00'),{dose:'확인한 복용량',mode:'asNeeded',times:[]});
});
test('snapshots retain only consented product metadata and regimen, excluding clinical text', () => {
  const product=savedMedicine({id:'202106092',name:'테스트용 제품',manufacturer:'테스트',sourceUrl:'https://nedrug.mfds.go.kr/',updatedAt:'2026-10-21',effect:'long clinical text',usage:'not a prescribed regimen',regimen:parseRegimen('1정','daily','08:00')});
  assert.equal(product.effect,undefined);assert.equal(product.usage,undefined);
  const snapshot={version:1,consentVersion:1,consentAt:'2026-10-21T00:00:00Z',medicines:[product]};
  assert.deepEqual(restoreSnapshot(snapshot),snapshot);
  assert.throws(()=>restoreSnapshot({...snapshot,version:2}));
  assert.throws(()=>restoreSnapshot({...snapshot,medicines:[product,product]}));
  assert.throws(()=>restoreSnapshot({...snapshot,medicines:[{...product,regimen:{dose:'1정',mode:'daily',times:['25:00']}}]}));
});
