import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function isTeacherOrAdmin(role: string | undefined) {
  return role === "TEACHER" || role === "ADMIN";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { tagId } = await params;
    const body = await req.json();
    const { name } = body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const tag = await db.courseTag.update({
      where: { id: tagId },
      data: { name: name.trim() },
    });
    return NextResponse.json(tag);
  } catch (error) {
    console.error("[TEACHER_COURSE_TAGS_PATCH]", error);
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2025") return new NextResponse("Tag not found", { status: 404 });
      if (code === "P2002") return new NextResponse("Tag name already exists", { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ tagId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const { tagId } = await params;

    // Remove tag from all courses and set user.gradeTagId to null for users who had this tag
    await db.$transaction([
      db.courseTagOnCourse.deleteMany({ where: { tagId } }),
      db.user.updateMany({
        where: { gradeTagId: tagId },
        data: { gradeTagId: null },
      }),
      db.courseTag.delete({ where: { id: tagId } }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[TEACHER_COURSE_TAGS_DELETE]", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2025") {
      return new NextResponse("Tag not found", { status: 404 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
