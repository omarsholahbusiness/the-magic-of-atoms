import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function isTeacherOrAdmin(role: string | undefined) {
  return role === "TEACHER" || role === "ADMIN";
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const tags = await db.courseTag.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
    });
    return NextResponse.json(tags);
  } catch (error) {
    console.error("[TEACHER_COURSE_TAGS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    if (!isTeacherOrAdmin(session.user.role)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await req.json();
    const { name } = body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return new NextResponse("Name is required", { status: 400 });
    }

    const maxPosition = await db.courseTag.aggregate({ _max: { position: true } }).then((r) => r._max.position ?? -1);
    const tag = await db.courseTag.create({
      data: { name: name.trim(), position: maxPosition + 1 },
    });
    return NextResponse.json(tag);
  } catch (error) {
    console.error("[TEACHER_COURSE_TAGS_POST]", error);
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2002") {
      return new NextResponse("Tag name already exists", { status: 400 });
    }
    return new NextResponse("Internal Error", { status: 500 });
  }
}
