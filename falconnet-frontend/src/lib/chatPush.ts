import { api } from '@/services/api';

function urlBase64ToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export async function enableChatPush(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') return false;

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
}

export function notifyForeground(title: string, body: string, url: string): void {
  if (typeof window === 'undefined' || document.visibilityState !== 'visible') return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const notification = new Notification(title, { body, icon: '/icons/icon.svg' });
  notification.onclick = () => {
    window.focus();
    window.location.href = url;
  };
}
