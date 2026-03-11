# Detailed Prompt: Course Tags (تحديد الصفوف / الصف) Feature

Use this entire document as the prompt for implementing the course tag feature in this LMS project. The project is **Next.js 15**, **React 19**, **Prisma**, **next-auth**, **Tailwind**, **RTL (Arabic)**. All new pages and components must be **responsive** and have **good, consistent UI** with the rest of the app.

---

## 1. Feature Overview

- **Course tags** (“صفوف” / grades or classes) are labels that teachers create and assign to courses.
- **Students** choose **exactly one** tag (الصف) when signing up. After login, they **only see courses that have at least one tag matching their chosen tag**; all other courses are hidden.
- **Teachers** manage tags on a dedicated page “تحديد الصفوف”, then assign **one or more** tags to each course in the course edit page under a section “تحديد الصف”.

---

## 2. Database Changes (Prisma)

- Add a **CourseTag** model (e.g. “صف” / grade):
  - `id` (String, uuid, primary key)
  - `name` (String, unique) — e.g. "الصف الاول الثانوي", "الصف الثاني الثانوي"
  - `createdAt`, `updatedAt`
- **Course**: add relation to tags. Use either:
  - **Option A:** Many-to-many: `tags CourseTag[]` with a join table `CourseTagOnCourse` (courseId, tagId), or
  - **Option B:** A single `tagIds String[]` on Course (if your DB supports array type; PostgreSQL does).
- Prefer **Option A** (proper many-to-many) for clarity and future flexibility.
- **User**: add optional `gradeTagId String?` and relation `gradeTag CourseTag?` (foreign key to CourseTag). So each user (student) has at most one selected “الصف”.
- Run migration and update Prisma client. Ensure existing users and courses still work (nullable/optional relations).

---

## 3. Teacher: “تحديد الصفوف” Page (Manage Tags)

- **Route:** `/dashboard/teacher/grades` is already used for “الدرجات”. Use a **new** route, e.g. **`/dashboard/teacher/course-tags`** (or `/dashboard/teacher/class-levels`), and show it in the sidebar with the **label “تحديد الصفوف”**.
- **Sidebar:** In `app/dashboard/_components/sidebar-routes.tsx`, add a new item in `teacherRoutes` with label **"تحديد الصفوف"** and href pointing to this new page (e.g. `/dashboard/teacher/course-tags`). Use an appropriate icon (e.g. `Tags` or `Layers` from lucide-react).
- **Page behavior:**
  - List all course tags (CourseTag) in a clear, responsive table or card list.
  - **Add:** Form or inline input to create a new tag (name only). Call an API to create CourseTag.
  - **Edit:** Inline or modal edit for tag name. Call an API to update CourseTag.
  - **Remove:** Delete a tag (with confirmation). Consider: if a tag is used by courses or users, either prevent deletion or handle cascade/clear references as per product rules (e.g. set course tag relations to empty and user.gradeTagId to null for that tag).
- **API routes:** Create under `app/api/` (e.g. `app/api/teacher/course-tags/route.ts`):
  - **GET** — return all CourseTags (for teacher only).
  - **POST** — create a new CourseTag (name in body).
  - **PATCH** and **DELETE** for a single tag (e.g. `app/api/teacher/course-tags/[tagId]/route.ts`).
- Protect all these APIs so only teacher (or admin) can access. Use existing auth pattern (e.g. `auth()` from `@/lib/auth` and check `user.role`).

---

## 4. Teacher: Course Edit Page — “تحديد الصف” Section

- **Location:** The course edit page is at `app/dashboard/(routes)/teacher/courses/[courseId]/page.tsx`. It already has sections like “تخصيص دورتك” (title, description, price), “الموارد والفصول”, “إعدادات الكورس” (image). Add a **new section** titled **“تحديد الصف”** (same naming as in the sidebar for consistency with the feature).
- **Placement:** Add this section in the same layout (e.g. in the left column with “تخصيص دورتك” or in “إعدادات الكورس”), keeping the same visual pattern (IconBadge + title, then the form component).
- **Component:** Create a new client component (e.g. `CourseTagsForm` or `GradeSelectorForm`) in `app/dashboard/(routes)/teacher/courses/[courseId]/_components/` that:
  - Fetches the list of all course tags (from the same GET API used by “تحديد الصفوف” page).
  - Shows a **multi-select** so the teacher can select **one, two, or more** tags for this course. Use existing UI primitives: the project has `components/ui/combobox.tsx` (single select); extend or add a **multi-select** (e.g. with Checkbox + Command/Popover, or a dedicated multi-select component). Display selected tags as badges or list.
  - Loads the course’s current tags (from `initialData` passed from the server).
  - On save, PATCH the course with the selected tag IDs (e.g. `tagIds: string[]`). The PATCH handler in `app/api/courses/[courseId]/route.ts` already does `data: { ...values }`; ensure it supports updating the many-to-many relation (e.g. `tags: { set: [...] }` or `connect`/`disconnect`).
- **Course page (server):** When loading the course in `[courseId]/page.tsx`, include `tags: true` (or `tags: { select: { id: true, name: true } }`) in the `include` so the form gets `initialData.tags`.
- **Completion checklist:** If the project has a “required fields” completion logic on the course edit page, decide whether “تحديد الصف” is required (at least one tag) or optional, and update the completion text/checks accordingly (e.g. add `course.tags?.length` to `requiredFields` if required).

---

## 5. Sign-Up Page: “الصف” Selector

- **File:** `app/(auth)/(routes)/sign-up/page.tsx`.
- Add a **required** field **“الصف”** (single select). The user must choose **exactly one** course tag.
- **Data:** Fetch course tags on load (e.g. from a **public** API route that returns only tag id and name, e.g. `GET /api/course-tags` or `GET /api/public/course-tags`). Do not expose teacher-only endpoints to unauthenticated users; use a dedicated public route that returns only the list of tags.
- **UI:** Use a select or combobox (single selection). Place it in the form with the same style as other fields (Label, spacing). Keep RTL and existing layout (e.g. below “تأكيد كلمة المرور” or before reCAPTCHA).
- **Submit:** When the form is submitted, send the selected tag id (e.g. `gradeTagId`) to the registration API together with `fullName`, `phoneNumber`, `password`, `confirmPassword`, `recaptchaToken`.
- **API:** In `app/api/auth/register/route.ts`, accept `gradeTagId` (optional or required). If required, validate that it exists in CourseTag table. When creating the user with `db.user.create`, set `gradeTagId` to the chosen value. Ensure only students (role USER) get this field; if teachers/admins are created elsewhere, leave their `gradeTagId` null.

---

## 6. Where Students See Courses — Apply Tag Filter

Students see courses in at least two places. **In both, filter courses so that only courses that have at least one tag matching the student’s `gradeTagId` are shown.** If the student has no `gradeTagId` (e.g. old account), decide: either show no courses or show all courses; the spec says “only courses with the same tag”, so prefer **filtering by tag when present, and when absent you may show no courses or all courses** (clarify with product; typically “show only matching” means: if user has no tag, show none or a message to set الصف).

- **Dashboard (main student dashboard):**  
  File: `app/dashboard/page.tsx`. It fetches `courses` with a `where` that includes purchases/chapter access. Add a condition: **only include courses that have at least one course tag equal to the user’s `gradeTagId`**. So:
  - Load the current user’s `gradeTagId` (e.g. from session or from `db.user.findUnique({ where: { id: session.user.id }, select: { gradeTagId: true } })`).
  - In the `db.course.findMany` (or equivalent) `where`, add: if `gradeTagId` is set, then `tags: { some: { id: gradeTagId } }` (or equivalent for your schema). If you store tagIds on Course, use `tagIds: { has: gradeTagId }`. Combine this with existing purchase/access conditions (AND).
- **Search / browse courses page:**  
  File: `app/dashboard/(routes)/search/page.tsx`. Same idea: the query that fetches published courses for the student must **also** filter by the student’s `gradeTagId` (only courses whose tags include that id). Apply the same `where` logic as above so that students only see courses matching their صف.

Do **not** change behavior for teacher/admin dashboards: they can continue to see all courses as today (e.g. teacher sees their own courses, admin sees all). The tag filter is **only for students (role USER)** on the dashboard and search pages.

---

## 7. Session / Auth (Optional but Recommended)

- So that the backend and frontend can know the student’s grade without re-querying the DB on every request, add `gradeTagId` (and optionally tag name) to the session.
- In `types/next-auth.d.ts`, add to `Session.user` and to `User`: `gradeTagId?: string | null;`.
- In `lib/auth.ts`, in the `jwt` callback, when `user` is present (credentials sign-in), set `token.gradeTagId = user.gradeTagId`. In the `session` callback, set `session.user.gradeTagId = token.gradeTagId`. For the credentials provider, the `authorize` function receives the user from DB: extend the query to include `gradeTagId` and return it on the user object so it gets into the JWT.
- If you use Google sign-in, decide whether Google users get a default tag or null; if null, the same “no tag” behavior applies (e.g. show no courses or all).

---

## 8. API Summary

- **Course tags CRUD (teacher):**  
  - `GET /api/teacher/course-tags` — list all tags  
  - `POST /api/teacher/course-tags` — body `{ name: string }`  
  - `PATCH /api/teacher/course-tags/[tagId]` — body `{ name: string }`  
  - `DELETE /api/teacher/course-tags/[tagId]`  
  All require teacher (or admin) auth.

- **Public (for sign-up):**  
  - `GET /api/course-tags` or `GET /api/public/course-tags` — returns `{ id, name }[]` for all tags (no auth). Use for sign-up page and optionally for course form.

- **Course update:**  
  - Existing `PATCH /api/courses/[courseId]` must accept tag relation updates (e.g. `tags: { set: [{ id: tagId1 }, { id: tagId2 }] }` or equivalent so the course’s tags are replaced by the selected list).

---

## 9. UI/UX Requirements

- **Responsive:** All new pages and forms must work on mobile and desktop (use existing grid/layout patterns from the dashboard).
- **RTL:** Keep RTL and Arabic labels; use existing components and spacing.
- **Consistency:** Use the same patterns as existing forms: e.g. `IconBadge`, `Button`, `Input`, `Label`, cards with border and padding, toast for success/error (e.g. `toast.success` / `toast.error` or project’s toast lib).
- **تحديد الصفوف page:** Clear list of tags with add/edit/delete and confirmation for delete.
- **تحديد الصف (course form):** Clear multi-select with selected tags visible; save/cancel or inline save like other course forms.
- **Sign-up:** Single select for “الصف” with a clear label and validation (required).

---

## 10. Example Flow (Recap)

1. Teacher goes to **“تحديد الصفوف”** (e.g. `/dashboard/teacher/course-tags`), adds tags: "الصف الاول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي".
2. Teacher goes to **“الكورسات”** → creates/edits a course → in **“تحديد الصف”** selects e.g. "الصف الاول الثانوي" and "الصف الثاني الثانوي". Saves. That course is now tagged with these two.
3. New user on **sign-up** sees **“الصف”** selector with those three options, chooses **one** (e.g. "الصف الاول الثانوي") and completes registration.
4. After login, on **dashboard** and **search**, the student sees **only** courses that have "الصف الاول الثانوي" (and possibly other tags); courses that have only "الصف الثالث الثانوي" (and not الاول) are **not** shown.

---

## 11. Files to Create or Modify (Checklist)

- **Prisma:** `prisma/schema.prisma` — add `CourseTag`, User.`gradeTagId`, Course–Tag relation; run migrate.
- **Sidebar:** `app/dashboard/_components/sidebar-routes.tsx` — add “تحديد الصفوف” link.
- **New page:** `app/dashboard/(routes)/teacher/course-tags/page.tsx` (or equivalent path) — list + add/edit/delete tags.
- **New APIs:** `app/api/teacher/course-tags/route.ts`, `app/api/teacher/course-tags/[tagId]/route.ts`; optionally `app/api/course-tags/route.ts` or `app/api/public/course-tags/route.ts` for public list.
- **Course edit:** `app/dashboard/(routes)/teacher/courses/[courseId]/page.tsx` — include `tags`, add “تحديد الصف” section and new form component.
- **New component:** e.g. `app/dashboard/(routes)/teacher/courses/[courseId]/_components/course-tags-form.tsx` (or grade-selector-form.tsx) — multi-select for course tags.
- **API courses PATCH:** `app/api/courses/[courseId]/route.ts` — support updating course tags (many-to-many set).
- **Sign-up:** `app/(auth)/(routes)/sign-up/page.tsx` — add “الصف” single select, call public tags API, send `gradeTagId` on submit.
- **Register API:** `app/api/auth/register/route.ts` — accept and save `gradeTagId`.
- **Dashboard (student):** `app/dashboard/page.tsx` — filter courses by `session.user.gradeTagId` (or user.gradeTagId).
- **Search (student):** `app/dashboard/(routes)/search/page.tsx` — filter courses by student’s grade tag.
- **Auth types:** `types/next-auth.d.ts` — add `gradeTagId` to Session and User.
- **Auth callbacks:** `lib/auth.ts` — in credentials `authorize` return user with `gradeTagId`; in jwt and session callbacks pass `gradeTagId`.

---

## 12. Edge Cases

- **No tags created yet:** “تحديد الصفوف” shows empty state; course form “تحديد الصف” shows empty selector; sign-up can show “لا توجد صفوف” and disable submit or show message until at least one tag exists (or allow sign-up without tag and set gradeTagId null).
- **User has no gradeTagId (legacy):** When filtering, treat as “no tag” and either show no courses or all courses (recommend: show no courses or prompt to set الصف in profile if you add that later).
- **Deleting a tag that is in use:** Either prevent delete or cascade: remove from all courses and set user.gradeTagId to null for users who had that tag.
- **All course tags removed from a course:** Course then matches no student’s tag; no student will see it until the teacher assigns at least one tag again.

Implement the feature following this prompt and the existing codebase patterns. Ensure responsive layout and good, consistent UI throughout.
