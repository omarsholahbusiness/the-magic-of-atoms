import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { notifyNewCoursePublished } from "@/lib/notifications";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const { userId } = await auth();
        const resolvedParams = await params;

        if (!userId) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const course = await db.course.findUnique({
            where: {
                id: resolvedParams.courseId,
                userId
            },
            include: {
                chapters: true,
                tags: { select: { tagId: true } }
            }
        });

        if (!course) {
            return new NextResponse("Not found", { status: 404 });
        }

        const hasPublishedChapters = course.chapters.some((chapter) => chapter.isPublished);

        if (!course.title || !course.description || !course.imageUrl || !hasPublishedChapters) {
            return new NextResponse("Missing required fields", { status: 401 });
        }

        const wasPublished = course.isPublished;
        const publishedCourse = await db.course.update({
            where: {
                id: resolvedParams.courseId,
                userId
            },
            data: {
                isPublished: !course.isPublished
            }
        });

        if (!wasPublished && publishedCourse.isPublished) {
            notifyNewCoursePublished({
                id: publishedCourse.id,
                title: publishedCourse.title,
                tags: course.tags,
            }).catch((err) => console.error("[NOTIFY_NEW_COURSE]", err));
        }

        return NextResponse.json(publishedCourse);
    } catch (error) {
        console.log("[COURSE_PUBLISH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 