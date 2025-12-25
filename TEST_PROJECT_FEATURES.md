# دليل اختبار الميزات الجديدة - Testing Guide for New Project Features

## 📋 نظرة عامة

هذا الدليل يحتوي على خطوات اختبار جميع الميزات الجديدة التي تم إضافتها لنظام المشاريع.

---

## 🔐 التحضير

### 1. الحصول على Tokens

```
# تسجيل دخول كـ Admin
POST /api/auth/login
Body: {
  "email": "admin@example.com",
  "password": "password"
}
→ احفظ adminToken

# تسجيل دخول كـ Client
POST /api/auth/login
Body: {
  "email": "client@example.com",
  "password": "password"
}
→ احفظ clientToken

# تسجيل دخول كـ Engineer
POST /api/auth/login
Body: {
  "email": "engineer@example.com",
  "password": "password"
}
→ احفظ engineerToken
```

---

## ✅ Test 1: Status Transition Validation

### 1.1 اختبار انتقال صحيح

```
PUT /api/projects/:projectId
Headers: {
  "Authorization": "Bearer {{adminToken}}"
}
Body: {
  "status": "Waiting for Engineers"
}
```

**Expected**: ✅ 200 OK - Status updated

---

### 1.2 اختبار انتقال غير صحيح

```
PUT /api/projects/:projectId
Headers: {
  "Authorization": "Bearer {{adminToken}}"
}
Body: {
  "status": "Completed"  // مباشرة من "Pending Review" (غير صحيح)
}
```

**Expected**: ❌ 400 Bad Request
```json
{
  "message": "لا يمكن تغيير الحالة من \"Pending Review\" إلى \"Completed\". التحولات المسموحة: Waiting for Engineers, Rejected, Cancelled"
}
```

---

### 1.3 اختبار Client يحاول تغيير حالة غير مسموحة

```
PUT /api/projects/:projectId
Headers: {
  "Authorization": "Bearer {{clientToken}}"
}
Body: {
  "status": "In Progress"  // Client لا يمكنه
}
```

**Expected**: ❌ 400 Bad Request - "العميل يمكنه فقط تغيير الحالة إلى: مسودة، في انتظار المراجعة، أو في انتظار المهندسين"

---

## ✅ Test 2: Project Start Date & Progress

### 2.1 إنشاء مشروع بـ Start Date

```
POST /api/projects
Headers: {
  "Authorization": "Bearer {{clientToken}}"
}
Body: {
  "title": "مشروع تجريبي",
  "description": "...",
  "country": "السعودية",
  "city": "الرياض",
  "projectType": "Construction",
  "startDate": "2024-01-01",
  "deadline": "2024-12-31"
}
```

**Expected**: ✅ 201 Created
```json
{
  "data": {
    "startDate": "2024-01-01T00:00:00.000Z",
    "deadline": "2024-12-31T00:00:00.000Z",
    "progress": 0
  }
}
```

---

### 2.2 تحديث Progress

```
PUT /api/projects/:projectId
Headers: {
  "Authorization": "Bearer {{adminToken}}"
}
Body: {
  "progress": 50
}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "progress": 50
  }
}
```

---

### 2.3 اختبار Progress غير صحيح

```
PUT /api/projects/:projectId
Body: {
  "progress": 150  // أكثر من 100
}
```

**Expected**: ❌ 400 Bad Request - Validation error

---

## ✅ Test 3: Status History

### 3.1 جلب تفاصيل المشروع (مع Status History)

```
GET /api/projects/:projectId
Headers: {
  "Authorization": "Bearer {{adminToken}}"
}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "statusHistory": [
      {
        "status": "Pending Review",
        "changedBy": "...",
        "changedAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "status": "Waiting for Engineers",
        "changedBy": "...",
        "changedAt": "2024-01-05T00:00:00.000Z",
        "reason": "Admin approval"
      }
    ]
  }
}
```

---

### 3.2 تغيير الحالة والتحقق من History

```
# Step 1: Change status
PUT /api/projects/:projectId
Body: {
  "status": "In Progress"
}

# Step 2: Check history
GET /api/projects/:projectId
```

**Expected**: ✅ يجب أن يظهر تغيير جديد في `statusHistory`

---

## ✅ Test 4: Hard Delete vs Soft Delete

### 4.1 Soft Delete (Client)

```
DELETE /api/projects/:projectId
Headers: {
  "Authorization": "Bearer {{clientToken}}"
}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم حذف المشروع بنجاح"
}
```

**Verify**: 
```
GET /api/projects/:projectId
```
**Expected**: ❌ 404 - المشروع غير موجود (لأن isActive = false)

---

### 4.2 Hard Delete (Admin Only)

```
DELETE /api/projects/:projectId/hard
Headers: {
  "Authorization": "Bearer {{adminToken}}"
}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم حذف المشروع نهائياً"
}
```

**Verify**: المشروع محذوف نهائياً من قاعدة البيانات

---

### 4.3 Engineer يحاول Hard Delete

```
DELETE /api/projects/:projectId/hard
Headers: {
  "Authorization": "Bearer {{engineerToken}}"
}
```

**Expected**: ❌ 403 Forbidden - "الحذف النهائي متاح للأدمن فقط"

---

## ✅ Test 5: Project Duplication

### 5.1 Duplicate Project (Client)

```
POST /api/projects/:projectId/duplicate
Headers: {
  "Authorization": "Bearer {{clientToken}}"
}
```

**Expected**: ✅ 201 Created
```json
{
  "message": "تم نسخ المشروع بنجاح",
  "data": {
    "title": "نسخة من [Original Title]",
    "status": "Draft",
    "progress": 0,
    "adminApproval": {
      "status": "pending"
    },
    "assignedEngineer": null,
    "attachments": [],
    "proposalsCount": 0
  }
}
```

---

### 5.2 Duplicate Project (Admin)

```
POST /api/projects/:projectId/duplicate
Headers: {
  "Authorization": "Bearer {{adminToken}}"
}
```

**Expected**: ✅ 201 Created - Admin can duplicate any project

---

### 5.3 Client يحاول نسخ مشروع لعميل آخر

```
POST /api/projects/:otherClientProjectId/duplicate
Headers: {
  "Authorization": "Bearer {{clientToken}}"
}
```

**Expected**: ❌ 403 Forbidden - "غير مصرح لك بنسخ هذا المشروع"

---

## ✅ Test 6: Project Notes/Comments

### 6.1 إضافة ملاحظة عادية (Client)

```
POST /api/projects/:projectId/notes
Headers: {
  "Authorization": "Bearer {{clientToken}}"
}
Body: {
  "note": "هذه ملاحظة عامة"
}
```

**Expected**: ✅ 201 Created
```json
{
  "message": "تم إضافة الملاحظة بنجاح",
  "data": {
    "note": "هذه ملاحظة عامة",
    "isInternal": false,
    "createdBy": {
      "name": "Client Name",
      "email": "client@example.com"
    },
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### 6.2 إضافة ملاحظة داخلية (Admin/Engineer)

```
POST /api/projects/:projectId/notes
Headers: {
  "Authorization": "Bearer {{adminToken}}"
}
Body: {
  "note": "هذه ملاحظة داخلية",
  "isInternal": true
}
```

**Expected**: ✅ 201 Created
```json
{
  "data": {
    "note": "هذه ملاحظة داخلية",
    "isInternal": true
  }
}
```

---

### 6.3 Client يحاول إضافة ملاحظة داخلية

```
POST /api/projects/:projectId/notes
Headers: {
  "Authorization": "Bearer {{clientToken}}"
}
Body: {
  "note": "ملاحظة",
  "isInternal": true
}
```

**Expected**: ✅ 201 Created - لكن `isInternal` سيكون `false` (تلقائياً)

---

### 6.4 جلب الملاحظات (Client)

```
GET /api/projects/:projectId/notes
Headers: {
  "Authorization": "Bearer {{clientToken}}"
}
```

**Expected**: ✅ 200 OK
```json
{
  "data": [
    {
      "note": "ملاحظة عامة",
      "isInternal": false,
      "createdBy": {...}
    }
    // لا تظهر الملاحظات الداخلية للـ Client
  ]
}
```

---

### 6.5 جلب الملاحظات (Admin)

```
GET /api/projects/:projectId/notes
Headers: {
  "Authorization": "Bearer {{adminToken}}"
}
```

**Expected**: ✅ 200 OK - يرى جميع الملاحظات (عامة + داخلية)

---

### 6.6 حذف ملاحظة (صاحب الملاحظة)

```
DELETE /api/projects/:projectId/notes/:noteId
Headers: {
  "Authorization": "Bearer {{clientToken}}"  // صاحب الملاحظة
}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم حذف الملاحظة بنجاح"
}
```

---

### 6.7 Admin يحذف ملاحظة لعميل آخر

```
DELETE /api/projects/:projectId/notes/:noteId
Headers: {
  "Authorization": "Bearer {{adminToken}}"
}
```

**Expected**: ✅ 200 OK - Admin can delete any note

---

### 6.8 Client يحاول حذف ملاحظة لعميل آخر

```
DELETE /api/projects/:projectId/notes/:noteId
Headers: {
  "Authorization": "Bearer {{clientToken}}"
}
```

**Expected**: ❌ 403 Forbidden - "غير مصرح لك بحذف هذه الملاحظة"

---

## 📊 Test Scenarios - سيناريوهات متكاملة

### Scenario 1: Workflow كامل

```
1. Client ينشئ مشروع
   POST /api/projects
   → status: "Pending Review"

2. Admin يوافق على المشروع
   PATCH /api/projects/:id/approve
   → status: "Waiting for Engineers" (يتم إضافة statusHistory)

3. Admin يغير الحالة إلى "In Progress"
   PUT /api/projects/:id
   Body: { "status": "In Progress" }
   → يتم التحقق من الانتقال + إضافة statusHistory

4. Admin يحدّث Progress
   PUT /api/projects/:id
   Body: { "progress": 75 }

5. Admin يضيف ملاحظة داخلية
   POST /api/projects/:id/notes
   Body: { "note": "تقدم ممتاز", "isInternal": true }

6. Client يرى الملاحظات (لا يرى الداخلية)
   GET /api/projects/:id/notes

7. Admin ينهي المشروع
   PUT /api/projects/:id
   Body: { "status": "Completed", "progress": 100 }

8. جلب تفاصيل المشروع النهائية
   GET /api/projects/:id
   → يجب أن يظهر: statusHistory كامل، progress: 100، جميع الملاحظات (للأدمن)
```

---

### Scenario 2: Duplication & Notes

```
1. Admin ينشئ مشروع معقد
   POST /api/projects
   Body: { ... }
   
2. Admin يضيف عدة ملاحظات
   POST /api/projects/:id/notes (multiple times)

3. Admin ينسخ المشروع
   POST /api/projects/:id/duplicate
   
4. التحقق: المشروع المنسوخ
   - Title: "نسخة من ..."
   - Status: "Draft"
   - Progress: 0
   - Notes: لا توجد (لا يتم نسخ الملاحظات)
   - Attachments: لا توجد
```

---

## 🔍 Quick Test Checklist

### ✅ Status Transition
- [ ] انتقال صحيح يعمل
- [ ] انتقال غير صحيح يرفض
- [ ] Client لا يمكنه تغيير للحالات المحظورة
- [ ] Status History يتم تتبعها

### ✅ Start Date & Progress
- [ ] يمكن إضافة startDate
- [ ] يمكن تحديث progress (0-100)
- [ ] progress > 100 يرفض
- [ ] progress < 0 يرفض

### ✅ Hard Delete
- [ ] Soft Delete يعمل (Client)
- [ ] Hard Delete يعمل (Admin)
- [ ] Engineer لا يمكنه Hard Delete
- [ ] Client لا يمكنه Hard Delete

### ✅ Duplication
- [ ] Client ينسخ مشروعه
- [ ] Admin ينسخ أي مشروع
- [ ] Client لا ينسخ مشروع غيره
- [ ] البيانات المنسوخة صحيحة

### ✅ Notes
- [ ] إضافة ملاحظة عادية
- [ ] إضافة ملاحظة داخلية (Admin)
- [ ] Client لا يرى الملاحظات الداخلية
- [ ] Admin يرى جميع الملاحظات
- [ ] حذف ملاحظة خاصة
- [ ] Admin يحذف أي ملاحظة

---

## 📝 ملاحظات مهمة

1. **Status Transitions**: يجب اتباع Workflow بدقة
2. **Progress**: يجب أن يكون بين 0-100
3. **Hard Delete**: Admin فقط - حذف نهائي
4. **Notes Internal**: Clients لا يرونها أبداً
5. **Duplication**: لا ينسخ attachments, proposals, assignedEngineer

---

## 🛠️ Tools للاختبار

- **Postman**: Import collection
- **API Dog**: نفس استخدام Postman
- **cURL**: Command line
- **Thunder Client**: VS Code extension

---

**📅 تاريخ الإنشاء**: ${new Date().toLocaleString('ar-SA')}
