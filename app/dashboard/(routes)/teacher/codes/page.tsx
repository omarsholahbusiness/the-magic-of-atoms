"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Search, Plus, Copy, Check, Ticket } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface Course {
  id: string;
  title: string;
  isPublished: boolean;
}

interface Chapter {
  id: string;
  title: string;
  position: number;
  courseId: string;
}

interface PurchaseCode {
  id: string;
  code: string;
  courseId: string;
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
  course: {
    id: string;
    title: string;
  };
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
  } | null;
}

interface ChapterCode {
  id: string;
  code: string;
  chapterId: string;
  isUsed: boolean;
  usedAt: string | null;
  createdAt: string;
  chapter: {
    id: string;
    title: string;
    course: { id: string; title: string };
  };
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
  } | null;
}

type CodeType = "course" | "chapter";

const TeacherCodesPage = () => {
  const [courseCodes, setCourseCodes] = useState<PurchaseCode[]>([]);
  const [chapterCodes, setChapterCodes] = useState<ChapterCode[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("all");
  const [codeTypeFilter, setCodeTypeFilter] = useState<"all" | CodeType>("all");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [selectedChapter, setSelectedChapter] = useState<string>("");
  const [codeType, setCodeType] = useState<CodeType>("course");
  const [codeCount, setCodeCount] = useState<string>("1");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    fetchCodes();
    fetchCourses();
  }, []);

  const fetchCodes = async () => {
    try {
      const response = await fetch("/api/teacher/codes");
      if (response.ok) {
        const data = await response.json();
        setCourseCodes(data.courseCodes || []);
        setChapterCodes(data.chapterCodes || []);
      } else {
        toast.error("حدث خطأ في تحميل الأكواد");
      }
    } catch (error) {
      console.error("Error fetching codes:", error);
      toast.error("حدث خطأ في تحميل الأكواد");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch("/api/courses");
      if (response.ok) {
        const data = await response.json();
        const publishedCourses = data.filter((course: Course) => course.isPublished);
        setCourses(publishedCourses);
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchChapters = async (courseId: string) => {
    if (!courseId) {
      setChapters([]);
      setSelectedChapter("");
      return;
    }
    try {
      const response = await fetch(`/api/courses/${courseId}/chapters`);
      if (response.ok) {
        const data = await response.json();
        setChapters(data);
        setSelectedChapter("");
      } else {
        setChapters([]);
      }
    } catch (error) {
      console.error("Error fetching chapters:", error);
      setChapters([]);
    }
  };

  const handleGenerateCodes = async () => {
    const count = parseInt(codeCount);
    if (!codeCount || count < 1 || count > 100) {
      toast.error("يرجى إدخال عدد الأكواد (1-100)");
      return;
    }
    if (codeType === "course" && !selectedCourse) {
      toast.error("يرجى اختيار الكورس");
      return;
    }
    if (codeType === "chapter" && !selectedChapter) {
      toast.error("يرجى اختيار الفصل");
      return;
    }

    setIsGenerating(true);
    try {
      const body = codeType === "course"
        ? { courseId: selectedCourse, count }
        : { chapterId: selectedChapter, count };
      const response = await fetch("/api/teacher/codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`تم إنشاء ${data.count} كود بنجاح`);
        setIsDialogOpen(false);
        setSelectedCourse("");
        setSelectedChapter("");
        setCodeCount("1");
        fetchCodes();
      } else {
        const error = await response.text();
        toast.error(error || "حدث خطأ أثناء إنشاء الأكواد");
      }
    } catch (error) {
      console.error("Error generating codes:", error);
      toast.error("حدث خطأ أثناء إنشاء الأكواد");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      toast.success("تم نسخ الكود");
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      toast.error("فشل نسخ الكود");
    }
  };

  const courseCodesForFilter = courseCodes.map((c) => ({ ...c, type: "course" as const }));
  const chapterCodesForFilter = chapterCodes.map((c) => ({
    ...c,
    type: "chapter" as const,
    courseId: c.chapter.course.id,
    courseTitle: c.chapter.course.title,
  }));
  const allCodes = [...courseCodesForFilter, ...chapterCodesForFilter];

  const filteredCodes = allCodes.filter((code) => {
    const searchTarget = code.type === "course"
      ? `${code.code} ${code.course.title}`
      : `${code.code} ${code.chapter.title} ${code.chapter.course.title}`;
    const matchesSearch = searchTarget.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCourse = courseFilter === "all" || code.courseId === courseFilter;
    const matchesType = codeTypeFilter === "all" || code.type === codeTypeFilter;
    return matchesSearch && matchesCourse && matchesType;
  });

  const usedCodes = filteredCodes.filter((code) => code.isUsed);
  const unusedCodes = filteredCodes.filter((code) => !code.isUsed);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">إدارة الأكواد</h1>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-brand hover:bg-brand/90">
          <Plus className="h-4 w-4 ml-2" />
          إنشاء أكواد جديدة
        </Button>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center space-x-2 flex-1">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="البحث بالكود أو اسم الكورس..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center space-x-2">
                <Label htmlFor="type-filter" className="whitespace-nowrap">نوع الكود:</Label>
                <Select value={codeTypeFilter} onValueChange={(v) => setCodeTypeFilter(v as typeof codeTypeFilter)}>
                  <SelectTrigger id="type-filter" className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="course">كورس كامل</SelectItem>
                    <SelectItem value="chapter">فصل</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Label htmlFor="course-filter" className="whitespace-nowrap">تصفية حسب الكورس:</Label>
                <Select value={courseFilter} onValueChange={setCourseFilter}>
                  <SelectTrigger id="course-filter" className="w-[250px]">
                    <SelectValue placeholder="جميع الكورسات" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الكورسات</SelectItem>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">إجمالي الأكواد</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCodes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">أكواد غير مستخدمة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{unusedCodes.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">أكواد مستخدمة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{usedCodes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>قائمة الأكواد</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCodes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              لا توجد أكواد
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">الكود</TableHead>
                  <TableHead className="text-right">النوع</TableHead>
                  <TableHead className="text-right">الكورس / الفصل</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                  <TableHead className="text-right">المستخدم</TableHead>
                  <TableHead className="text-right">تاريخ الاستخدام</TableHead>
                  <TableHead className="text-right">تاريخ الإنشاء</TableHead>
                  <TableHead className="text-right">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCodes.map((code) => (
                  <TableRow key={`${code.type}-${code.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {code.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyCode(code.code)}
                          className="h-6 w-6 p-0"
                        >
                          {copiedCode === code.code ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {code.type === "course" ? "كورس كامل" : "فصل"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {code.type === "course"
                        ? code.course.title
                        : `${code.chapter.course.title} → ${code.chapter.title}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant={code.isUsed ? "secondary" : "default"}>
                        {code.isUsed ? "مستخدم" : "غير مستخدم"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {code.user ? (
                        <div>
                          <div className="font-medium">{code.user.fullName}</div>
                          <div className="text-sm text-muted-foreground">{code.user.phoneNumber}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {code.usedAt
                        ? format(new Date(code.usedAt), "yyyy-MM-dd HH:mm", { locale: ar })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {format(new Date(code.createdAt), "yyyy-MM-dd HH:mm", { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyCode(code.code)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Codes Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>إنشاء أكواد جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">نوع الكود</Label>
              <Select value={codeType} onValueChange={(v) => { setCodeType(v as CodeType); fetchChapters(selectedCourse); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">كورس كامل</SelectItem>
                  <SelectItem value="chapter">فصل</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {codeType === "course" ? (
              <div>
                <Label htmlFor="course" className="mb-2 block">الكورس</Label>
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الكورس" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <>
                <div>
                  <Label className="mb-2 block">الكورس</Label>
                  <Select value={selectedCourse} onValueChange={(v) => { setSelectedCourse(v); fetchChapters(v); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الكورس أولاً" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">الفصل</Label>
                  <Select value={selectedChapter} onValueChange={setSelectedChapter} disabled={!selectedCourse}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفصل" />
                    </SelectTrigger>
                    <SelectContent>
                      {chapters.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label htmlFor="count" className="mb-2 block">عدد الأكواد</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="100"
                value={codeCount}
                onChange={(e) => setCodeCount(e.target.value)}
                placeholder="1-100"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              إلغاء
            </Button>
            <Button
              onClick={handleGenerateCodes}
              disabled={
                isGenerating ||
                !codeCount ||
                (codeType === "course" && !selectedCourse) ||
                (codeType === "chapter" && !selectedChapter)
              }
              className="bg-brand hover:bg-brand/90"
            >
              {isGenerating ? "جاري الإنشاء..." : "إنشاء"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherCodesPage;

