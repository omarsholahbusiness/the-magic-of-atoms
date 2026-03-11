"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { toast } from "sonner";

export function NotificationPrompt() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = async () => {
    if (!supported) {
      toast.error("الإشعارات غير مدعومة في هذا المتصفح");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/notifications/vapid-public");
      const { publicKey } = await res.json();
      if (!publicKey) {
        toast.error("الإشعارات غير مفعّلة من الإدارة");
        setLoading(false);
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await reg.update();
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = sub.toJSON();
      const payload = {
        endpoint: json.endpoint,
        keys: json.keys,
      };

      const saveRes = await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!saveRes.ok) throw new Error("Failed to save");
      setPermission(Notification.permission);
      toast.success("تم تفعيل إشعارات الكورسات الجديدة");
    } catch (e) {
      console.error(e);
      toast.error("فشل تفعيل الإشعارات");
    } finally {
      setLoading(false);
    }
  };

  const enable = async () => {
    if (Notification.permission === "denied") {
      toast.error("تم رفض الإشعارات. يرجى السماح من إعدادات المتصفح.");
      return;
    }
    if (Notification.permission === "granted") {
      await subscribe();
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      await subscribe();
    } else if (result === "denied") {
      toast.error("تم رفض الإشعارات");
    }
  };

  if (!supported || permission === "granted") return null;

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={enable}
        disabled={loading}
        className="gap-2"
      >
        <Bell className="h-4 w-4" />
        {loading ? "جاري التفعيل..." : "تفعيل إشعارات الكورسات الجديدة"}
      </Button>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
