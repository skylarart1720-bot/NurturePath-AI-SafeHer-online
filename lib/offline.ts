'use client';
import Dexie, { type Table } from 'dexie';

type Pending = {
  idempotencyKey: string;
  actorId: string;
  deviceId: string;
  mutationType: string;
  ciphertext: string;
  iv: string;
  createdAt: number;
  error?: string;
};
class Queue extends Dexie {
  pending!: Table<Pending, string>;
  constructor() {
    super('nurturepath-offline-v1');
    this.version(1).stores({ pending: '&idempotencyKey,actorId,createdAt' });
  }
}
const queue = new Queue();
const keyName = 'np_device_key';
function bytes(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
function base64(value: ArrayBuffer | Uint8Array) {
  return btoa(String.fromCharCode(...new Uint8Array(value)));
}
async function deviceKey() {
  let value = sessionStorage.getItem(keyName);
  if (!value) {
    value = base64(crypto.getRandomValues(new Uint8Array(32)));
    sessionStorage.setItem(keyName, value);
  }
  return crypto.subtle.importKey('raw', bytes(value), 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function rememberActor(actor: {
  id: string;
  role: string;
  name: string;
  clinicId: string | null;
}) {
  const old = sessionStorage.getItem('np_actor');
  if (old && JSON.parse(old).id !== actor.id) await wipeOffline();
  sessionStorage.setItem('np_actor', JSON.stringify(actor));
  if (!sessionStorage.getItem('np_device'))
    sessionStorage.setItem('np_device', crypto.randomUUID());
  const expired = await queue.pending
    .where('createdAt')
    .below(Date.now() - 24 * 3600000)
    .primaryKeys();
  await queue.pending.bulkDelete(expired);
}
export function rememberedActor() {
  try {
    return JSON.parse(sessionStorage.getItem('np_actor') ?? 'null') as {
      id: string;
      name: string;
      role: string;
      clinicId: string | null;
    } | null;
  } catch {
    return null;
  }
}
export async function pendingItems() {
  const actor = rememberedActor();
  if (!actor) return [];
  return queue.pending.where('actorId').equals(actor.id).toArray();
}
export async function enqueue(mutationType: string, payload: unknown) {
  const actor = rememberedActor();
  if (!actor) throw new Error('Sign in online before capturing offline records.');
  if (
    ![
      'mothers',
      'appointments',
      'appointments/update',
      'followups/update',
      'referrals',
      'referrals/update',
    ].includes(mutationType)
  )
    throw new Error('This action requires an online connection.');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await deviceKey(),
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const idempotencyKey = crypto.randomUUID();
  await queue.pending.add({
    idempotencyKey,
    actorId: actor.id,
    deviceId: sessionStorage.getItem('np_device')!,
    mutationType,
    ciphertext: base64(encrypted),
    iv: base64(iv),
    createdAt: Date.now(),
  });
  window.dispatchEvent(new Event('np-queue'));
  return { queued: true, id: idempotencyKey };
}
export async function syncQueue() {
  let complete = 0;
  for (const item of (await pendingItems()).sort((a, b) => a.createdAt - b.createdAt)) {
    if (Date.now() - item.createdAt > 24 * 3600000) {
      await queue.pending.delete(item.idempotencyKey);
      continue;
    }
    try {
      const decoded = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: bytes(item.iv) },
        await deviceKey(),
        bytes(item.ciphertext),
      );
      const response = await fetch('/api/offline/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idempotencyKey: item.idempotencyKey,
          deviceId: item.deviceId,
          mutationType: item.mutationType,
          payload: JSON.parse(new TextDecoder().decode(decoded)),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Sync failed.');
      await queue.pending.delete(item.idempotencyKey);
      complete++;
    } catch (error) {
      await queue.pending.update(item.idempotencyKey, {
        error: error instanceof Error ? error.message : 'Review this pending item.',
      });
      break;
    }
  }
  window.dispatchEvent(new Event('np-queue'));
  return complete;
}
export async function discardPending(id: string) {
  if (!(await pendingItems()).some((i) => i.idempotencyKey === id)) return;
  await queue.pending.delete(id);
  window.dispatchEvent(new Event('np-queue'));
}
export async function wipeOffline() {
  await queue.pending.clear();
  sessionStorage.removeItem(keyName);
  sessionStorage.removeItem('np_actor');
  sessionStorage.removeItem('np_device');
}
