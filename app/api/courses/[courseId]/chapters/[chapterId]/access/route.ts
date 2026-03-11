import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ courseId: string; chapterId: string }> }
) {
  const resolvedParams = await params;
  const { courseId, chapterId } = resolvedParams;

  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const chapter = await db.chapter.findUnique({
      where: {
        id: chapterId,
        courseId: courseId,
      },
    });

    if (!chapter) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Free chapters are always accessible
    if (chapter.isFree) {
      return NextResponse.json({ hasAccess: true });
    }

    // Check if user has full course access (purchase)
    const coursePurchase = await db.purchase.findFirst({
      where: {
        userId,
        courseId,
        status: "ACTIVE",
      },
    });

    if (coursePurchase) {
      return NextResponse.json({ hasAccess: true });
    }

    // Check if user has chapter-specific access (via chapter code)
    const chapterAccess = await db.chapterAccess.findFirst({
      where: {
        userId,
        chapterId,
      },
    });

    return NextResponse.json({ hasAccess: !!chapterAccess });
  } catch (error) {
    console.error("[CHAPTER_ACCESS]", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
