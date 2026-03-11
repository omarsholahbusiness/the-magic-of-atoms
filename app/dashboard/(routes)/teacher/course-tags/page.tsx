"use client";

import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tags, Pencil, Trash2, Loader2, GripVertical } from "lucide-react";
import toast from "react-hot-toast";
import axios from "axios";
import { cn } from "@/lib/utils";

type CourseTag = {
  id: string;
  name: string;
  position: number;
  createdAt: string;
  updatedAt: string;
};

export default function CourseTagsPage() {
  const [tags, setTags] = useState<CourseTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reordering, setReordering] = useState(false);

  const fetchTags = async () => {
    try {
      const res = await axios.get("/api/teacher/course-tags");
      setTags(res.data);
    } catch {
      toast.error("فشل تحميل الصفوف");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await axios.post("/api/teacher/course-tags", { name: newName.trim() });
      toast.success("تمت إضافة الصف");
      setNewName("");
      fetchTags();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && typeof err.response?.data === "string" ? err.response.data : "فشل الإضافة";
      toast.error(msg);
    } finally {
      setAdding(false);
    }
  };

  const startEdit = (tag: CourseTag) => {
    setEditingId(tag.id);
    setEditName(tag.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      await axios.patch(`/api/teacher/course-tags/${editingId}`, { name: editName.trim() });
      toast.success("تم التحديث");
      setEditingId(null);
      setEditName("");
      fetchTags();
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err) && typeof err.response?.data === "string" ? err.response.data : "فشل التحديث";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await axios.delete(`/api/teacher/course-tags/${deleteId}`);
      toast.success("تم الحذف");
      setDeleteId(null);
      fetchTags();
    } catch {
      toast.error("فشل الحذف");
    } finally {
      setDeleting(false);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const from = result.source.index;
    const to = result.destination.index;
    if (from === to) return;

    const reordered = Array.from(tags);
    const [removed] = reordered.splice(from, 1);
    reordered.splice(to, 0, removed);

    setTags(reordered);
    setReordering(true);
    try {
      await axios.patch("/api/teacher/course-tags/reorder", {
        tagIds: reordered.map((t) => t.id),
      });
      toast.success("تم تحديث الترتيب");
    } catch {
      toast.error("فشل تحديث الترتيب");
      fetchTags();
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">تحديد الصفوف</h1>
        <p className="text-muted-foreground">
          إدارة صفوف الكورسات (مثل الصف الأول الثانوي، الثاني الثانوي). يتم تعيين الصف للطالب عند التسجيل وعرض الكورسات حسب الصف.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tags className="h-5 w-5" />
            إضافة صف جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="new-tag-name">اسم الصف</Label>
              <Input
                id="new-tag-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="مثال: الصف الاول الثانوي"
                disabled={adding}
              />
            </div>
            <Button type="submit" disabled={adding || !newName.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : "إضافة"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>قائمة الصفوف</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : tags.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد صفوف. أضف صفاً أولاً.</p>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="course-tags-list">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={cn("space-y-2", reordering && "opacity-70 pointer-events-none")}
                  >
                    {tags.map((tag, index) => (
                      <Draggable key={tag.id} draggableId={tag.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm transition-shadow",
                              snapshot.isDragging && "shadow-md ring-2 ring-primary/20"
                            )}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="touch-none cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
                            >
                              <GripVertical className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              {editingId === tag.id ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Input
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    disabled={saving}
                                    className="max-w-xs"
                                  />
                                  <Button size="sm" onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                                    إلغاء
                                  </Button>
                                </div>
                              ) : (
                                <span className="font-medium">{tag.name}</span>
                              )}
                            </div>
                            {editingId !== tag.id && (
                              <div className="flex items-center gap-1 shrink-0">
                                <Button size="icon" variant="ghost" onClick={() => startEdit(tag)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setDeleteId(tag.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الصف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الصف؟ سيتم إزالته من جميع الكورسات وسيتم إلغاء تعيين الصف للطلاب الذين اختاروه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "حذف"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
