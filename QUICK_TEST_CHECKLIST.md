# Checklist سريع للاختبار - Quick Testing Checklist

## ✅ Phase 1: Quick Wins

### Status Transition Validation
- [ ] ✅ انتقال صحيح: Pending Review → Waiting for Engineers
- [ ] ❌ انتقال غير صحيح: Pending Review → Completed (يجب أن يرفض)
- [ ] ❌ Client يحاول: status → In Progress (يجب أن يرفض)
- [ ] ✅ Status History يتم تتبعه

### Start Date
- [ ] ✅ Create project مع startDate
- [ ] ✅ Update startDate
- [ ] ✅ Get project → يظهر startDate

### Progress
- [ ] ✅ Update progress = 50
- [ ] ❌ progress = 150 (يجب أن يرفض)
- [ ] ❌ progress = -10 (يجب أن يرفض)
- [ ] ✅ Get project → يظهر progress

### Status History
- [ ] ✅ Create project → statusHistory موجود
- [ ] ✅ Change status → statusHistory يزداد
- [ ] ✅ Get project → statusHistory كامل

---

## ✅ Phase 2: Critical Features

### Hard Delete
- [ ] ✅ Soft Delete (Client) → isActive = false
- [ ] ✅ Hard Delete (Admin) → Project محذوف نهائياً
- [ ] ❌ Hard Delete (Client) → 403 Forbidden
- [ ] ❌ Hard Delete (Engineer) → 403 Forbidden

### Duplication
- [ ] ✅ Client ينسخ مشروعه
- [ ] ✅ Admin ينسخ أي مشروع
- [ ] ❌ Client ينسخ مشروع غيره → 403
- [ ] ✅ Title: "نسخة من ..."
- [ ] ✅ Status: "Draft"
- [ ] ✅ Progress: 0
- [ ] ✅ لا ينسخ: attachments, proposals, assignedEngineer

### Notes
- [ ] ✅ Add note (public)
- [ ] ✅ Add note (internal - Admin)
- [ ] ✅ Get notes (Admin) → يرى جميع الملاحظات
- [ ] ✅ Get notes (Client) → يرى العامة فقط
- [ ] ✅ Delete own note
- [ ] ✅ Admin deletes any note
- [ ] ❌ Client deletes other's note → 403

---

## 🔄 Integration Tests

### Complete Workflow
- [ ] 1. Create Project
- [ ] 2. Admin Approve → Status History updated
- [ ] 3. Update Status → Validation works
- [ ] 4. Update Progress
- [ ] 5. Add Notes (internal + public)
- [ ] 6. Get Project → All data correct
- [ ] 7. Duplicate Project
- [ ] 8. Hard Delete duplicate

---

## ⚡ Quick Test (5 minutes)

```
1. POST /projects (with startDate)
2. PUT /projects/:id (status: "Waiting for Engineers")
3. PUT /projects/:id (progress: 50)
4. GET /projects/:id (check statusHistory, progress)
5. POST /projects/:id/notes
6. GET /projects/:id/notes
7. POST /projects/:id/duplicate
8. DELETE /projects/:id/hard (Admin)
```

---

## 📝 Expected Results Summary

### Status Transitions
- ✅ Valid transitions: 200 OK
- ❌ Invalid transitions: 400 Bad Request with message

### Progress
- ✅ 0-100: 200 OK
- ❌ >100 or <0: 400 Bad Request

### Hard Delete
- ✅ Admin: 200 OK
- ❌ Others: 403 Forbidden

### Notes
- ✅ Client sees: public notes only
- ✅ Admin sees: all notes
- ✅ Delete own: 200 OK
- ✅ Admin delete any: 200 OK
- ❌ Delete other's: 403 Forbidden

---

**⏱️ Estimated Time**: 15-20 minutes for full testing
