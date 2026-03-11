"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import toast from "react-hot-toast";

const ALL_VALUE = "__ALL__"; // "الكل" = course visible to all tags/users

type TagOption = { id: string; name: string };

type CourseTagRelation = {
  tagId: string;
  tag: { id: string; name: string };
};

interface CourseTagsFormProps {
  initialData: {
    tags?: CourseTagRelation[];
  };
  courseId: string;
}

export function CourseTagsForm({ initialData, courseId }: CourseTagsFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [allTags, setAllTags] = useState<TagOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const initialTagIds = (initialData.tags ?? []).map((t) => t.tag.id);
  useEffect(() => {
    setSelectedIds(initialTagIds.length === 0 ? new Set([ALL_VALUE]) : new Set(initialTagIds));
  }, [initialTagIds.join(",")]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await axios.get<TagOption[]>("/api/course-tags");
        if (!cancelled) setAllTags(res.data);
      } catch {
        if (!cancelled) toast.error("فشل تحميل الصفوف");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (id === ALL_VALUE) {
        next.clear();
        next.add(ALL_VALUE);
        return next;
      }
      next.delete(ALL_VALUE);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const tagIds = selectedIds.has(ALL_VALUE) || selectedIds.size === 0
        ? []
        : Array.from(selectedIds).filter((id) => id !== ALL_VALUE);
      await axios.patch(`/api/courses/${courseId}`, { tagIds });
      toast.success("تم تحديث صفوف الكورس");
      setIsEditing(false);
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("فشل التحديث");
    } finally {
      setSaving(false);
    }
  };

  const isAllSelected = selectedIds.has(ALL_VALUE) || selectedIds.size === 0;
  const selectedTags = allTags.filter((t) => selectedIds.has(t.id));
  const displayText = isAllSelected
    ? "الكل"
    : selectedTags.length
    ? selectedTags.map((t) => t.name).join("، ")
    : "اختر الصفوف...";

  return (
    <div className="mt-6 border bg-card rounded-md p-4">
      <div className="font-medium flex items-center justify-between">
        تحديد الصف
        <Button
          onClick={() => setIsEditing((c) => !c)}
          variant="ghost"
          size="sm"
        >
          {isEditing ? "إلغاء" : (
            <>
              <Pencil className="h-4 w-4 mr-2" />
              تعديل الصفوف
            </>
          )}
        </Button>
      </div>
      {!isEditing && (
        <div className="flex flex-wrap gap-2 mt-2">
          {isAllSelected ? (
            <Badge variant="secondary">الكل</Badge>
          ) : selectedTags.length === 0 ? (
            <span className="text-sm text-muted-foreground">لم يتم تحديد صفوف</span>
          ) : (
            selectedTags.map((t) => (
              <Badge key={t.id} variant="secondary">
                {t.name}
              </Badge>
            ))
          )}
        </div>
      )}
      {isEditing && (
        <div className="mt-4 space-y-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                <span className="truncate">{displayText}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              {loading ? (
                <div className="flex justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Command>
                  <CommandInput placeholder="بحث..." />
                  <CommandList>
                    <CommandEmpty>لا توجد صفوف</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="الكل"
                        onSelect={() => toggle(ALL_VALUE)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            isAllSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                        الكل (مرئي لجميع الصفوف)
                      </CommandItem>
                      {allTags.map((tag) => (
                        <CommandItem
                          key={tag.id}
                          value={tag.name}
                          onSelect={() => toggle(tag.id)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedIds.has(tag.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {tag.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              )}
            </PopoverContent>
          </Popover>
          <div className="flex flex-wrap gap-2">
            {!isAllSelected &&
              Array.from(selectedIds)
                .filter((id) => id !== ALL_VALUE)
                .map((id) => {
                  const tag = allTags.find((t) => t.id === id);
                  if (!tag) return null;
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => toggle(id)}
                    >
                      {tag.name} ×
                    </Badge>
                  );
                })}
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ"}
          </Button>
        </div>
      )}
    </div>
  );
}
