import webPush from "web-push";
import { db } from "@/lib/db";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(
    "mailto:support@example.com",
    vapidPublicKey,
    vapidPrivateKey
  );
}

export function isPushConfigured(): boolean {
  return !!(vapidPublicKey && vapidPrivateKey);
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body?: string; url?: string }
): Promise<void> {
  if (!isPushConfigured()) return;

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });
  if (subscriptions.length === 0) return;

  const payloadStr = JSON.stringify(payload);

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        },
        payloadStr,
        { TTL: 86400 }
      )
    )
  );
  const toRemove: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const err = r.reason as { statusCode?: number; body?: string } | undefined;
      console.error("[PUSH_SEND_ERROR]", { userId, statusCode: err?.statusCode, body: err?.body });
      if (err?.statusCode && [404, 410].includes(err.statusCode)) {
        toRemove.push(subscriptions[i].id);
      }
    }
  });
  if (toRemove.length) {
    await db.pushSubscription.deleteMany({ where: { id: { in: toRemove } } });
  }
}

/**
 * Notify students whose grade matches the course tags (or all students if course has no tags)
 * when a new course is published.
 */
export async function notifyNewCoursePublished(course: {
  id: string;
  title: string;
  tags: { tagId: string }[];
}): Promise<void> {
  if (!isPushConfigured()) {
    console.warn("[NOTIFY_NEW_COURSE] Push not configured: check VAPID env vars on Vercel");
    return;
  }

  const tagIds = course.tags.map((t) => t.tagId);

  const userIds =
    tagIds.length === 0
      ? await db.user.findMany({
          where: { role: "USER" },
          select: { id: true },
        }).then((u) => u.map((x) => x.id))
      : await db.user.findMany({
          where: {
            role: "USER",
            gradeTagId: { in: tagIds },
          },
          select: { id: true },
        }).then((u) => u.map((x) => x.id));

  const subsCount = await db.pushSubscription.count({
    where: { userId: { in: userIds } },
  });
  console.log("[NOTIFY_NEW_COURSE]", { courseId: course.id, userIds: userIds.length, subscriptions: subsCount });

  const payload = {
    title: "كورس جديد متاح",
    body: course.title,
    url: `/dashboard/search`,
  };

  const notificationDelegate = (db as { notification?: { createMany: (args: { data: { userId: string; title: string; body: string | null; url: string | null }[] }) => Promise<unknown> } }).notification;
  if (notificationDelegate) {
    await notificationDelegate.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: payload.title,
        body: payload.body,
        url: payload.url,
      })),
    });
  }

  await Promise.all(
    userIds.map((userId) => sendPushToUser(userId, payload))
  );
}
