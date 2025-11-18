import { getSupabase } from "@/lib/supabase";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}

export async function registerPushSubscription(profileId) {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return;

    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    const supabase = getSupabase();

    await supabase.from("push_subscriptions").insert({
      profile_id: profileId,
      endpoint: sub.endpoint,
      p256dh: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("p256dh")))),
      auth: btoa(String.fromCharCode(...new Uint8Array(sub.getKey("auth")))),
      device: navigator.userAgent,
    });

    console.log("🔔 Push Subscription Guardada!");
    return sub;
  } catch (err) {
    console.error("❌ Error creating push subscription:", err);
  }
}
