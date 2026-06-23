import { api } from './api';

function publicKeyToUint8Array(publicKey: string) {
  const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
  const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}

export async function browserPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export async function getBrowserPushState() {
  const supported = await browserPushSupported();
  if (!supported) return { supported, permission: 'denied' as NotificationPermission, subscribed: false };
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return { supported, permission: Notification.permission, subscribed: Boolean(subscription) };
}

export async function enableBrowserPush() {
  if (!(await browserPushSupported())) {
    throw new Error('Browser push is not supported on this device');
  }

  const key = await api.getPushPublicKey() as { enabled: boolean; public_key?: string | null };
  if (!key.enabled || !key.public_key) {
    throw new Error('Push notifications are not configured on the server');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted');
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: publicKeyToUint8Array(key.public_key),
  });
  await api.subscribePush(subscription.toJSON() as Record<string, unknown>);
  return subscription;
}

export async function disableBrowserPush() {
  if (!(await browserPushSupported())) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  await api.unsubscribePush(subscription.toJSON() as Record<string, unknown>);
  await subscription.unsubscribe();
}
