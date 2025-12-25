# دليل اختبار نظام الإشعارات والشات - API Testing Guide

## 🎯 نظرة عامة

هذا الدليل يرشدك لاختبار جميع الأنظمة الجديدة:
1. نظام الإشعارات (Notifications)
2. نظام الرسائل مع Integration
3. System User Messages

---

## 📋 المتطلبات الأولية

### 1. الحصول على Tokens

#### تسجيل دخول Admin:
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**احفظ الـ Token في متغير: `adminToken`**

---

#### تسجيل دخول Engineer:
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "engineer@example.com",
  "password": "your_password"
}
```

**احفظ الـ Token في متغير: `engineerToken`**

---

#### تسجيل دخول Client:
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "client@example.com",
  "password": "your_password"
}
```

**احفظ الـ Token في متغير: `clientToken`**

---

## 🧪 الاختبارات التفصيلية

### ✅ Test 1: جلب الإشعارات (قبل أي نشاط)

```
GET /api/notifications
Headers:
  Authorization: Bearer {{engineerToken}}
  Content-Type: application/json
```

**Expected Response:**
```json
{
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

✅ **يجب أن تكون المصفوفة فارغة في البداية**

---

### ✅ Test 2: عدد غير المقروءة

```
GET /api/notifications/unread/count
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected Response:**
```json
{
  "data": {
    "unreadCount": 0
  }
}
```

---

### ✅ Test 3: إنشاء مشروع (للاختبار)

```
POST /api/projects
Headers:
  Authorization: Bearer {{clientToken}}
  Content-Type: application/json

Body:
{
  "title": "مشروع اختبار الإشعارات",
  "description": "هذا مشروع للاختبار",
  "location": "الرياض",
  "projectType": "Construction",
  "budget": {
    "amount": 50000,
    "currency": "SAR"
  }
}
```

**احفظ `projectId` من الـ Response**

---

### ✅ Test 4: الموافقة على المشروع (Admin)

```
PATCH /api/projects/{{projectId}}/approve
Headers:
  Authorization: Bearer {{adminToken}}
```

**Expected:** Status 200 ✅

---

### ✅ Test 5: تقديم عرض (Engineer) - سيُنشئ System Messages

```
POST /api/proposals
Headers:
  Authorization: Bearer {{engineerToken}}
  Content-Type: application/json

Body:
{
  "projectId": "{{projectId}}",
  "description": "عرض اختبار شامل",
  "estimatedTimeline": "3 أشهر",
  "relevantExperience": "خبرة 5 سنوات في البناء",
  "proposedBudget": {
    "amount": 45000,
    "currency": "SAR"
  }
}
```

**Expected:** 
- Status 201 ✅
- سيتم إنشاء:
  - ProjectRoom
  - ChatRooms (Admin-Engineer, Admin-Client)
  - System Messages في الغرف

---

### ✅ Test 6: جلب Chat Rooms

```
GET /api/chat-rooms
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
- يجب أن تجد ChatRoom من نوع `admin-engineer`
- احفظ `chatRoomId`

---

### ✅ Test 7: إرسال رسالة جديدة (يجب أن ينشئ Notification)

```
POST /api/messages
Headers:
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json

Body:
{
  "chatRoomId": "{{chatRoomId}}",
  "content": "مرحبا! هذه رسالة اختبار",
  "type": "text"
}
```

**Expected:**
- Status 201 ✅
- الرسالة يتم إنشاؤها
- **يجب أن ينشئ Notification للمهندس تلقائياً**

---

### ✅ Test 8: التحقق من الإشعارات (Engineer)

```
GET /api/notifications
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
- يجب أن تجد إشعار جديد من نوع `message_received`
- الإشعار يحتوي على:
  - `type: "message_received"`
  - `title: "رسالة جديدة"`
  - `data.chatRoomId` و `data.messageId`
  - `isRead: false`

**احفظ `notificationId`**

---

### ✅ Test 9: عدد غير المقروءة (يجب أن يكون 1)

```
GET /api/notifications/unread/count
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
```json
{
  "data": {
    "unreadCount": 1
  }
}
```

---

### ✅ Test 10: جلب إشعار معين

```
GET /api/notifications/{{notificationId}}
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
- يجب أن يعيد تفاصيل الإشعار الكاملة

---

### ✅ Test 11: تحديد إشعار كمقروء

```
PATCH /api/notifications/{{notificationId}}/read
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
```json
{
  "message": "تم تحديد الإشعار كمقروء",
  "data": {
    "_id": "...",
    "isRead": true,
    "readAt": "2025-01-XX..."
  }
}
```

---

### ✅ Test 12: التحقق من عدد غير المقروءة (يجب أن يكون 0)

```
GET /api/notifications/unread/count
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
```json
{
  "data": {
    "unreadCount": 0
  }
}
```

---

### ✅ Test 13: جلب غير المقروءة فقط

```
GET /api/notifications?unreadOnly=true
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
- يجب أن تكون المصفوفة فارغة (لأننا قرأنا الإشعار)

---

### ✅ Test 14: تحديد جميع الإشعارات كمقروءة

```
PATCH /api/notifications/read-all
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
```json
{
  "message": "تم تحديد جميع الإشعارات كمقروءة",
  "data": {
    "updatedCount": 0
  }
}
```

---

### ✅ Test 15: حذف إشعار

```
DELETE /api/notifications/{{notificationId}}
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
```json
{
  "message": "تم حذف الإشعار بنجاح"
}
```

---

### ✅ Test 16: حذف جميع الإشعارات المقروءة

```
DELETE /api/notifications/read/all
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
```json
{
  "message": "تم حذف جميع الإشعارات المقروءة",
  "data": {
    "deletedCount": 1
  }
}
```

---

### ✅ Test 17: التحقق من System Messages

```
GET /api/messages/room/{{chatRoomId}}
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
- يجب أن تجد System Messages في الرسائل
- `sender` يجب أن يكون ObjectId (ليس string "system")
- `type: "system"`

---

### ✅ Test 18: قبول عرض (Admin) - سيُنشئ System Message في Group Chat

```
PUT /api/proposals/{{proposalId}}/status
Headers:
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json

Body:
{
  "status": "accepted"
}
```

**Expected:**
- Status 200 ✅
- سيتم إنشاء Group ChatRoom
- System Message في Group ChatRoom

---

### ✅ Test 19: التحقق من Group ChatRoom

```
GET /api/chat-rooms
Headers:
  Authorization: Bearer {{engineerToken}}
Query: ?type=group
```

**Expected:**
- يجب أن تجد Group ChatRoom
- System Message موجودة فيها

---

## 🔍 الاختبارات المتقدمة

### Test 20: Pagination في الإشعارات

```
GET /api/notifications?page=1&limit=10
Headers:
  Authorization: Bearer {{engineerToken}}
```

**Expected:**
- Response يحتوي على `meta` مع معلومات Pagination

---

### Test 21: إرسال رسائل متعددة (لإنشاء إشعارات متعددة)

أرسل 3 رسائل في ChatRoom مختلفين، ثم تحقق من:
- عدد الإشعارات = 3
- جميعها `isRead: false`

---

### Test 22: الأمان - محاولة الوصول لإشعارات مستخدم آخر

```
GET /api/notifications/{{notificationId}}
Headers:
  Authorization: Bearer {{anotherUserToken}}
```

**Expected:**
- Status 404 أو 403 ❌
- يجب ألا يرى إشعارات مستخدم آخر

---

## ✅ Checklist الاختبار

- [ ] جلب الإشعارات (فارغة في البداية)
- [ ] عدد غير المقروءة (0 في البداية)
- [ ] إنشاء مشروع وموافقته
- [ ] تقديم عرض (ينشئ System Messages)
- [ ] إرسال رسالة (ينشئ Notification)
- [ ] التحقق من وجود الإشعار
- [ ] تحديد إشعار كمقروء
- [ ] عدد غير المقروءة (يقل بعد القراءة)
- [ ] حذف إشعار
- [ ] System Messages تستخدم System User ID (ليس string)
- [ ] قبول عرض (ينشئ Group ChatRoom + System Message)

---

## 🐛 المشاكل المحتملة وطرق الحل

### 1. لا توجد إشعارات بعد إرسال رسالة؟
- ✅ تأكد أن المرسل والمستقبل في نفس ChatRoom
- ✅ تأكد أن `chatRoom.participants` يحتوي على المستخدمين
- ✅ تحقق من Logs للخطأ

### 2. System Messages لا تعمل؟
- ✅ تحقق أن System User موجود في DB
- ✅ تحقق أن `getSystemUserId()` يعمل
- ✅ تأكد أن `sender` هو ObjectId وليس string

### 3. WebSocket Notifications لا تعمل؟
- ✅ تأكد أن WebSocket Server يعمل
- ✅ تحقق من Connection في Client
- ✅ تأكد أن `sendToUser()` يتم استدعاؤها

---

## 📝 ملاحظات مهمة

1. **System User**: يتم إنشاؤه تلقائياً عند أول استخدام
   - Email: `system@hixa.com`
   - Role: `admin`
   - Name: `نظام`

2. **Notifications**: يتم إنشاؤها تلقائياً عند:
   - إرسال رسالة جديدة (لجميع المشاركين ما عدا المرسل)
   - يمكن إضافتها يدوياً عند موافقة/رفض المشاريع/العروض

3. **Real-time**: Notifications يتم إرسالها عبر WebSocket تلقائياً

---

## 🎯 النتيجة المتوقعة

بعد إكمال جميع الاختبارات:
- ✅ نظام Notifications يعمل بشكل كامل
- ✅ Integration مع Messages يعمل
- ✅ System Messages تستخدم System User ID
- ✅ Real-time Notifications تعمل (إذا Client متصل)

---

**📝 تاريخ الدليل**: ${new Date().toLocaleString('ar-SA')}


