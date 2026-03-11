import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function PATCH() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const notificationDelegate = (db as { notification?: { updateMany: (args: unknown) => Promise<unknown> } }).notification;
    if (notificationDelegate) {
      await notificationDelegate.updateMany({
        where: { userId, readAt: null },
        data: { readAt: new Date() },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[NOTIFICATIONS_READ_ALL]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
