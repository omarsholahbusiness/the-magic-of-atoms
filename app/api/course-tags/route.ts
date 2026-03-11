import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Public API: returns all course tags (id, name) for sign-up and course forms.
 * No auth required.
 */
export async function GET() {
  try {
    const tags = await db.courseTag.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    });
    return NextResponse.json(tags);
  } catch (error) {
    console.error("[COURSE_TAGS]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
