import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { randomBytes } from "crypto";

// Generate unique code (must be unique across both PurchaseCode and ChapterCode)
async function generateUniqueCode(): Promise<string> {
  let code: string;
  let isUnique = false;
  while (!isUnique) {
    code = randomBytes(8).toString("hex").toUpperCase();
    const [existingPurchase, existingChapter] = await Promise.all([
      db.purchaseCode.findUnique({ where: { code } }),
      db.chapterCode.findUnique({ where: { code } }),
    ]);
    if (!existingPurchase && !existingChapter) {
      return code;
    }
  }
  return randomBytes(8).toString("hex").toUpperCase(); // fallback for type safety
}

// GET - List all codes (course and chapter codes)
export async function GET(req: NextRequest) {
  try {
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "TEACHER") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const [purchaseCodes, chapterCodes] = await Promise.all([
      db.purchaseCode.findMany({
        where: { createdBy: userId },
        include: {
          course: { select: { id: true, title: true } },
          user: { select: { id: true, fullName: true, phoneNumber: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.chapterCode.findMany({
        where: { createdBy: userId },
        include: {
          chapter: {
            select: {
              id: true,
              title: true,
              course: { select: { id: true, title: true } },
            },
          },
          user: { select: { id: true, fullName: true, phoneNumber: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      courseCodes: purchaseCodes,
      chapterCodes: chapterCodes,
    });
  } catch (error) {
    console.error("[TEACHER_CODES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Generate new codes
export async function POST(req: NextRequest) {
  try {
    const { userId, user } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    if (user?.role !== "TEACHER") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { courseId, chapterId, count } = await req.json();

    if (!count || count < 1 || count > 100) {
      return new NextResponse("Invalid request: count (1-100) required", { status: 400 });
    }

    if (chapterId) {
      // Generate chapter codes
      const chapter = await db.chapter.findUnique({
        where: { id: chapterId },
        include: { course: true },
      });

      if (!chapter) {
        return new NextResponse("Chapter not found", { status: 404 });
      }

      // Verify teacher owns the course
      if (chapter.course.userId !== userId) {
        return new NextResponse("Forbidden", { status: 403 });
      }

      const codes: { code: string; chapterId: string; createdBy: string; isUsed: boolean }[] = [];
      for (let i = 0; i < count; i++) {
        codes.push({
          code: await generateUniqueCode(),
          chapterId,
          createdBy: userId,
          isUsed: false,
        });
      }

      await db.chapterCode.createMany({ data: codes });

      const createdCodesWithDetails = await db.chapterCode.findMany({
        where: {
          createdBy: userId,
          chapterId,
          code: { in: codes.map((c) => c.code) },
        },
        include: {
          chapter: {
            select: {
              id: true,
              title: true,
              course: { select: { id: true, title: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: count,
      });

      return NextResponse.json({
        success: true,
        type: "chapter",
        codes: createdCodesWithDetails,
        count: createdCodesWithDetails.length,
      });
    }

    // Generate course codes
    if (!courseId) {
      return new NextResponse("Invalid request: courseId or chapterId required", { status: 400 });
    }

    const course = await db.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      return new NextResponse("Course not found", { status: 404 });
    }

    const codes: { code: string; courseId: string; createdBy: string; isUsed: boolean }[] = [];
    for (let i = 0; i < count; i++) {
      codes.push({
        code: await generateUniqueCode(),
        courseId,
        createdBy: userId,
        isUsed: false,
      });
    }

    await db.purchaseCode.createMany({ data: codes });

    const createdCodesWithDetails = await db.purchaseCode.findMany({
      where: {
        createdBy: userId,
        courseId,
        code: { in: codes.map((c) => c.code) },
      },
      include: {
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: count,
    });

    return NextResponse.json({
      success: true,
      type: "course",
      codes: createdCodesWithDetails,
      count: createdCodesWithDetails.length,
    });
  } catch (error) {
    console.error("[TEACHER_CODES_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

