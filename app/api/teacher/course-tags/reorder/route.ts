import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function isTeacherOrAdmin(role: string | undefined) {
  return role === "TEACHER" || role === "ADMIN";
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { tagIds } = body;
    if (!Array.isArray(tagIds) || tagIds.some((id: unknown) => typeof id !== "string")) {
      return new NextResponse("tagIds array of strings is required", { status: 400 });
    }

    await db.$transaction(
      tagIds.map((tagId: string, index: number) =>
        db.courseTag.update({
          where: { id: tagId },
          data: { position: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[TEACHER_COURSE_TAGS_REORDER]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
