import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ courseId: string }> }
) {
    try {
        const resolvedParams = await params;
        const courseId = resolvedParams.courseId;

        let userId: string | null = null;
        try {
            const authResult = await auth();
            userId = authResult.userId;
        } catch {
            // User not authenticated
        }

        // Get chapters
        const chapters = await db.chapter.findMany({
            where: {
                courseId,
                isPublished: true
            },
            include: {
                userProgress: {
                    where: { userId: userId || "" },
                    select: {
                        isCompleted: true
                    }
                }
            },
            orderBy: {
                position: "asc"
            }
        });

        // Get published quizzes
        const quizzes = await db.quiz.findMany({
            where: {
                courseId,
                isPublished: true
            },
            include: {
                quizResults: {
                    where: { studentId: userId || "" },
                    select: {
                        id: true,
                        score: true,
                        totalPoints: true,
                        percentage: true
                    }
                }
            },
            orderBy: {
                position: "asc"
            }
        });

        // Get course access and chapter access for authenticated user
        let hasCourseAccess = false;
        const chapterAccessIds = new Set<string>();
        if (userId) {
            const [purchase, chapterAccesses] = await Promise.all([
                db.purchase.findFirst({
                    where: { userId, courseId, status: "ACTIVE" }
                }),
                db.chapterAccess.findMany({
                    where: { userId },
                    select: { chapterId: true }
                })
            ]);
            hasCourseAccess = !!purchase;
            chapterAccesses.forEach((ca) => chapterAccessIds.add(ca.chapterId));
        }

        // Combine and sort by position, add hasAccess for chapters
        const allContent = [
            ...chapters.map(chapter => ({
                ...chapter,
                type: 'chapter' as const,
                hasAccess: chapter.isFree || hasCourseAccess || chapterAccessIds.has(chapter.id)
            })),
            ...quizzes.map(quiz => ({
                ...quiz,
                type: 'quiz' as const,
                hasAccess: hasCourseAccess
            }))
        ].sort((a, b) => a.position - b.position);

        return NextResponse.json(allContent);
    } catch (error) {
        console.log("[COURSE_CONTENT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
} 