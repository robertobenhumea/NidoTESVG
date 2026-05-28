import { api } from '@/services/api';
import { getApiBaseUrl, getStoredAuthToken } from '@/lib/utils';

export type PushPermission = 'granted' | 'denied' | 'default' | 'unsupported';

export interface MailPushStatus {
  permission: PushPermission;
  subscribed: boolean;
}

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function getMailPushStatus(): Promise<MailPushStatus> {
  if (typeof window === 'undefined'
    || !('Notification' in window)
    || !('serviceWorker' in navigator)
    || !('PushManager' in window)) {
    return { permission: 'unsupported', subscribed: false };
  }
  const permission = Notification.permission as PushPermission;
  if (permission !== 'granted') return { permission, subscribed: false };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return { permission: 'granted', subscribed: !!sub };
  } catch {
    return { permission: 'granted', subscribed: false };
  }
}

export async function enableMailPush(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') return false;

  try {
    const [{ publicKey }, registration] = await Promise.all([
      api.get<{ publicKey: string }>('/push/vapid-public-key', { suppressAuthExpiry: true }),
      navigator.serviceWorker.ready,
    ]);
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
    });
    await api.post('/push/subscribe', subscription.toJSON(), { suppressAuthExpiry: true });
    return true;
  } catch {
    return false;
  }
}

export async function disableMailPush(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return;
    const token = getStoredAuthToken();
    await fetch(`${getApiBaseUrl()}/push/subscribe`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {});
    await sub.unsubscribe();
  } catch {
    // silently ignore
  }
}
