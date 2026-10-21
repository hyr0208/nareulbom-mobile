export type KeyValueStore = { get: (key: string) => Promise<string | null>; set: (key: string, value: string) => Promise<void>; remove: (key: string) => Promise<void> };
const prefix = 'nareulbom.v1';
const pointer = `${prefix}.active`;
const maxChunks = 128;
function chunksOf(text: string) {
  const chunks: string[] = []; let current = ''; let size = 0;
  for (const character of text) {
    const cp = character.codePointAt(0)!;
    const bytes = cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
    if (size + bytes > 1500) { chunks.push(current); current = ''; size = 0; }
    current += character; size += bytes;
  }
  if (current) chunks.push(current);
  if (!chunks.length || chunks.length > maxChunks) throw new Error('저장할 데이터가 너무 많아요. 복용 목록을 줄여 주세요.');
  return chunks;
}
export function createVault(store: KeyValueStore) {
  async function count(bank: string) {
    const raw = await store.get(`${prefix}.${bank}.count`);
    if (raw === null) return 0;
    if (!/^[0-9]+$/.test(raw) || Number(raw) > maxChunks) throw new Error('기기 저장정보를 확인하지 못했어요.');
    return Number(raw);
  }
  async function purge(bank: string) {
    const total = await count(bank);
    for (let i = 0; i < total; i++) await store.remove(`${prefix}.${bank}.${i}`);
    await store.remove(`${prefix}.${bank}.count`);
  }
  return {
    async read(): Promise<unknown | null> {
      const bank = await store.get(pointer);
      if (bank === null) return null;
      if (bank !== 'a' && bank !== 'b') throw new Error('기기 정보 삭제가 완료되지 않았어요. 전체 삭제를 다시 시도해 주세요.');
      const total = await count(bank); if (!total) throw new Error('저장된 복용 정보를 읽지 못했어요.');
      const chunks: string[] = [];
      for (let i = 0; i < total; i++) {
        const chunk = await store.get(`${prefix}.${bank}.${i}`);
        if (chunk === null) throw new Error('저장된 복용 정보 일부를 읽지 못했어요.');
        chunks.push(chunk);
      }
      return JSON.parse(chunks.join(''));
    },
    async write(value: unknown) {
      const previous = await store.get(pointer);
      if (previous !== null && previous !== 'a' && previous !== 'b') throw new Error('기기 정보 삭제를 먼저 완료해 주세요.');
      const bank = previous === 'a' ? 'b' : 'a';
      await purge(bank);
      const chunks = chunksOf(JSON.stringify(value));
      // Record the planned size first, so interrupted writes can always be erased.
      await store.set(`${prefix}.${bank}.count`, String(chunks.length));
      for (let i = 0; i < chunks.length; i++) await store.set(`${prefix}.${bank}.${i}`, chunks[i]);
      // A single key is the commit point. A failed staged write preserves the old version.
      await store.set(pointer, bank);
      let cleanupPending = false;
      if (previous) { try { await purge(previous); } catch { cleanupPending = true; } }
      return { cleanupPending };
    },
    async clear() {
      // Persist deletion intent so a partial deletion cannot be mistaken for valid data.
      await store.set(pointer, 'erasing');
      await purge('a'); await purge('b'); await store.remove(pointer);
    },
  };
}
