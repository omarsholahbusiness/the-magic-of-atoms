import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

// POST - Redeem a code (course code or chapter code)
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return new NextResponse("Code is required", { status: 400 });
    }

    const normalizedCode = code.toUpperCase().trim();

    // First check for course code (PurchaseCode)
    const purchaseCode = await db.purchaseCode.findUnique({
      where: { code: normalizedCode },
      include: {
        course: true,
      },
    });

    if (purchaseCode) {
      // Course code flow
      if (purchaseCode.isUsed) {
        return new NextResponse("Code has already been used", { status: 400 });
      }

      const existingPurchase = await db.purchase.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId: purchaseCode.courseId,
          },
        },
      });

      if (existingPurchase && existingPurchase.status === "ACTIVE") {
        return new NextResponse("You have already purchased this course", { status: 400 });
      }

      const result = await db.$transaction(async (tx) => {
        await tx.purchaseCode.update({
          where: { id: purchaseCode.id },
          data: {
            isUsed: true,
            usedBy: userId,
            usedAt: new Date(),
          },
        });

        if (existingPurchase && existingPurchase.status === "FAILED") {
          await tx.purchase.delete({
            where: { id: existingPurchase.id },
          });
        }

        const purchase = await tx.purchase.create({
          data: {
            userId,
            courseId: purchaseCode.courseId,
            status: "ACTIVE",
            purchaseCodeId: purchaseCode.id,
          },
        });

        return { purchase };
      });

      return NextResponse.json({
        success: true,
        type: "course",
        purchaseId: result.purchase.id,
        course: {
          id: purchaseCode.course.id,
          title: purchaseCode.course.title,
        },
      });
    }

    // Check for chapter code (ChapterCode)
    const chapterCode = await db.chapterCode.findUnique({
      where: { code: normalizedCode },
      include: {
        chapter: {
          include: {
            course: true,
          },
        },
      },
    });

    if (chapterCode) {
      // Chapter code flow
      if (chapterCode.isUsed) {
        return new NextResponse("Code has already been used", { status: 400 });
      }

      const existingChapterAccess = await db.chapterAccess.findUnique({
        where: {
          userId_chapterId: {
            userId,
            chapterId: chapterCode.chapterId,
          },
        },
      });

      if (existingChapterAccess) {
        return new NextResponse("You have already unlocked this chapter", { status: 400 });
      }

      await db.$transaction(async (tx) => {
        await tx.chapterCode.update({
          where: { id: chapterCode.id },
          data: {
            isUsed: true,
            usedBy: userId,
            usedAt: new Date(),
          },
        });

        await tx.chapterAccess.create({
          data: {
            userId,
            chapterId: chapterCode.chapterId,
            chapterCodeId: chapterCode.id,
          },
        });
      });

      return NextResponse.json({
        success: true,
        type: "chapter",
        chapter: {
          id: chapterCode.chapter.id,
          title: chapterCode.chapter.title,
          courseId: chapterCode.chapter.courseId,
          courseTitle: chapterCode.chapter.course.title,
        },
      });
    }

    return new NextResponse("Invalid code", { status: 404 });
  } catch (error) {
    console.error("[REDEEM_CODE]", error);
    if (error instanceof Error) {
      return new NextResponse(`Internal Error: ${error.message}`, { status: 500 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

