import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const notificationDelegate = (db as { notification?: { count: (args: unknown) => Promise<number>; findMany: (args: unknown) => Promise<unknown[]> } }).notification;
    if (!notificationDelegate) {
      return NextResponse.json({ unreadCount: 0, notifications: [] });
    }

    const [unreadCount, notifications] = await Promise.all([
      notificationDelegate.count({
        where: { userId, readAt: null },
      }),
      notificationDelegate.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    return NextResponse.json({ unreadCount, notifications });
  } catch (error) {
    console.error("[NOTIFICATIONS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
