# دليل اختبار نظام الدردشة - Chat System Testing Guide

## 📌 معلومات أساسية

**Base URL**: `https://hixa.onrender.com/api` أو `http://localhost:5000/api`

**جميع المسارات محمية**: تحتاج `Authorization: Bearer YOUR_TOKEN_HERE`

---

## 📋 ترتيب الاختبار الموصى به

### الخطوة 1️⃣: التحضير
1. تسجيل دخول كـ Admin (لإنشاء غرف المشروع وغرف الدردشة)
2. تسجيل دخول كمستخدمين مختلفين (للاختبار)

### الخطوة 2️⃣: إنشاء البيانات الأساسية
1. إنشاء Project (إذا لم يكن موجوداً)
2. إنشاء ProjectRoom (غرفة المشروع)
3. إنشاء ChatRoom (غرفة الدردشة)

### الخطوة 3️⃣: اختبار نظام الدردشة
1. جلب غرف الدردشة
2. إرسال رسائل
3. جلب الرسائل
4. تحديث الرسائل
5. التفاعلات
6. البحث

---

## 1️⃣ مسارات Chat Rooms

### 1.1 جلب جميع غرف الدردشة الخاصة بي
```
GET /api/chat-rooms
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "project": "507f1f77bcf86cd799439012",
      "projectRoom": "507f1f77bcf86cd799439013",
      "type": "admin-engineer",
      "participants": [...],
      "lastMessage": {...},
      "status": "active"
    }
  ]
}
```

---

### 1.2 جلب غرف الدردشة الخاصة بمشروع معين
```
GET /api/chat-rooms/project-room/:projectRoomId
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Example:**
```
GET /api/chat-rooms/project-room/507f1f77bcf86cd799439013
```

**Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "project": "507f1f77bcf86cd799439012",
      "projectRoom": "507f1f77bcf86cd799439013",
      "type": "admin-engineer",
      "participants": [
        {
          "user": {
            "_id": "...",
            "name": "Admin User",
            "email": "admin@example.com",
            "role": "admin"
          },
          "role": "admin",
          "joinedAt": "2024-01-01T00:00:00.000Z"
        }
      ],
      "lastMessage": {
        "content": "آخر رسالة",
        "sender": "...",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    }
  ]
}
```

---

### 1.3 جلب غرفة دردشة معينة
```
GET /api/chat-rooms/:chatRoomId
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Example:**
```
GET /api/chat-rooms/507f1f77bcf86cd799439011
```

**Response (200):**
```json
{
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "project": "507f1f77bcf86cd799439012",
    "projectRoom": "507f1f77bcf86cd799439013",
    "type": "admin-engineer",
    "engineer": {
      "_id": "...",
      "name": "Engineer Name"
    },
    "participants": [...],
    "lastMessage": {...},
    "status": "active",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 1.4 إنشاء غرفة دردشة جديدة (Admin فقط)
```
POST /api/chat-rooms
```

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN_HERE
Content-Type: application/json
```

**Body:**
```json
{
  "project": "507f1f77bcf86cd799439012",
  "projectRoom": "507f1f77bcf86cd799439013",
  "type": "admin-engineer",
  "engineer": "507f1f77bcf86cd799439014"
}
```

**أنواع الغرف:**
- `admin-engineer`: محادثة بين admin و engineer
- `admin-client`: محادثة بين admin و client
- `group`: محادثة جماعية

**ملاحظة مهمة**: `engineer` مطلوب فقط إذا كان `type` = `admin-engineer`

**Response (201):**
```json
{
  "message": "تم إنشاء غرفة الدردشة بنجاح",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "project": "507f1f77bcf86cd799439013",
    "projectRoom": "507f1f77bcf86cd799439014",
    "type": "admin-engineer",
    "participants": [],
    "status": "active"
  }
}
```

---

## 2️⃣ مسارات Messages (الرسائل)

### 2.1 إرسال رسالة جديدة

#### أ) رسالة نصية فقط
```
POST /api/messages
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Body:**
```json
{
  "chatRoomId": "507f1f77bcf86cd799439011",
  "content": "مرحباً، هذه رسالة تجريبية",
  "type": "text"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "تم إرسال الرسالة بنجاح",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "chatRoom": "507f1f77bcf86cd799439011",
    "sender": {
      "_id": "...",
      "name": "User Name",
      "email": "user@example.com",
      "role": "admin",
      "avatar": {...}
    },
    "content": "مرحباً، هذه رسالة تجريبية",
    "type": "text",
    "attachments": [],
    "readBy": [],
    "reactions": [],
    "isEdited": false,
    "isDeleted": false,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

#### ب) رسالة مع مرفقات (ملفات)
```
POST /api/messages
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: multipart/form-data
```

**Body (Form Data):**
- `chatRoomId`: `507f1f77bcf86cd799439011`
- `content`: `رسالة مع مرفق`
- `type`: `file` (أو `text` إذا كان هناك نص)
- `attachments`: [اختيار ملف/ملفات]

**ملاحظة**: يمكن إرفاق أكثر من ملف (حتى 10 ملفات)

---

#### ج) الرد على رسالة
```
POST /api/messages
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Body:**
```json
{
  "chatRoomId": "507f1f77bcf86cd799439011",
  "content": "هذا رد على الرسالة السابقة",
  "type": "text",
  "replyTo": "507f1f77bcf86cd799439020"
}
```

**Response:** ستحتوي الرسالة على `replyTo` populated:
```json
{
  "data": {
    "_id": "...",
    "content": "هذا رد على الرسالة السابقة",
    "replyTo": {
      "_id": "507f1f77bcf86cd799439020",
      "content": "الرسالة الأصلية",
      "sender": {
        "name": "Original Sender",
        "avatar": {...}
      }
    }
  }
}
```

---

### 2.2 جلب رسائل غرفة معينة
```
GET /api/messages/room/:chatRoomId?page=1&limit=20
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Query Parameters:**
- `page` (optional): رقم الصفحة (default: 1)
- `limit` (optional): عدد الرسائل (default: 20, max: 100)

**Example:**
```
GET /api/messages/room/507f1f77bcf86cd799439011?page=1&limit=20
```

**Response (200):**
```json
{
  "data": [
    {
      "_id": "507f1f77bcf86cd799439020",
      "chatRoom": "507f1f77bcf86cd799439011",
      "sender": {
        "_id": "...",
        "name": "User Name",
        "email": "user@example.com",
        "role": "admin",
        "avatar": {...}
      },
      "content": "الرسالة",
      "type": "text",
      "attachments": [],
      "replyTo": null,
      "reactions": [],
      "readBy": [...],
      "isEdited": false,
      "isDeleted": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "total": 50,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

---

### 2.3 تحديد رسالة كمقروءة
```
PATCH /api/messages/:messageId/read
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Example:**
```
PATCH /api/messages/507f1f77bcf86cd799439020/read
```

**Response (200):**
```json
{
  "message": "تم تحديث حالة القراءة بنجاح"
}
```

---

### 2.4 جلب عدد الرسائل غير المقروءة
```
GET /api/messages/unread/count
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response (200):**
```json
{
  "data": {
    "total": 5,
    "unreadCounts": [
      {
        "chatRoom": "507f1f77bcf86cd799439011",
        "count": 3
      },
      {
        "chatRoom": "507f1f77bcf86cd799439012",
        "count": 2
      }
    ]
  }
}
```

---

### 2.5 تعديل رسالة
```
PUT /api/messages/:messageId
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Body:**
```json
{
  "content": "المحتوى المعدل"
}
```

**Example:**
```
PUT /api/messages/507f1f77bcf86cd799439020
```

**Response (200):**
```json
{
  "message": "تم تحديث الرسالة بنجاح",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "content": "المحتوى المعدل",
    "isEdited": true,
    "updatedAt": "2024-01-01T01:00:00.000Z"
  }
}
```

**⚠️ ملاحظة**: يمكن فقط للمرسل أو Admin تعديل الرسالة

---

### 2.6 حذف رسالة
```
DELETE /api/messages/:messageId
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Example:**
```
DELETE /api/messages/507f1f77bcf86cd799439020
```

**Response (200):**
```json
{
  "message": "تم حذف الرسالة بنجاح"
}
```

**⚠️ ملاحظة**: 
- حذف ناعم (soft delete) - الرسالة لا تُحذف من قاعدة البيانات
- يمكن فقط للمرسل أو Admin حذف الرسالة
- الرسائل المحذوفة لا تظهر في قائمة الرسائل

---

### 2.7 إضافة/إزالة تفاعل (Reaction)
```
POST /api/messages/:messageId/reaction
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Body:**
```json
{
  "emoji": "👍"
}
```

**Example:**
```
POST /api/messages/507f1f77bcf86cd799439020/reaction
```

**Response (200):**
```json
{
  "message": "تم إضافة التفاعل",
  "data": {
    "_id": "507f1f77bcf86cd799439020",
    "reactions": [
      {
        "user": {
          "_id": "...",
          "name": "User Name",
          "avatar": {...}
        },
        "emoji": "👍"
      }
    ]
  }
}
```

**ملاحظة**: إذا كان التفاعل موجوداً، سيتم إزالته. إذا لم يكن موجوداً، سيتم إضافته.

---

### 2.8 البحث في الرسائل
```
GET /api/messages/search?roomId=507f1f77bcf86cd799439011&query=نص البحث&page=1&limit=20
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Query Parameters:**
- `roomId` (required): معرف غرفة الدردشة
- `query` (required): نص البحث
- `page` (optional): رقم الصفحة
- `limit` (optional): عدد النتائج

**Example:**
```
GET /api/messages/search?roomId=507f1f77bcf86cd799439011&query=مرحباً&page=1&limit=20
```

**Response (200):**
```json
{
  "data": [
    {
      "_id": "...",
      "content": "مرحباً، هذه رسالة تجريبية",
      "sender": {...},
      "createdAt": "..."
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

---

## 🧪 سيناريوهات اختبار كاملة

### سيناريو 1: محادثة كاملة من البداية

#### الخطوة 1: تسجيل الدخول
```http
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "Admin123"
}
```
**احفظي**: `token` من الـ Response

---

#### الخطوة 2: جلب غرف الدردشة الخاصة بي
```http
GET /api/chat-rooms
Authorization: Bearer YOUR_TOKEN
```

إذا لم توجد غرف، انتقلي للخطوة 3.

---

#### الخطوة 3: إنشاء غرفة دردشة (Admin فقط)
```http
POST /api/chat-rooms
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "project": "507f1f77bcf86cd799439012",
  "projectRoom": "507f1f77bcf86cd799439013",
  "type": "admin-engineer",
  "engineer": "507f1f77bcf86cd799439014"
}
```
**احفظي**: `_id` من الـ Response (chatRoomId)

---

#### الخطوة 4: إرسال رسالة نصية
```http
POST /api/messages
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "chatRoomId": "507f1f77bcf86cd799439011",
  "content": "مرحباً، هذه رسالة تجريبية",
  "type": "text"
}
```
**احفظي**: `_id` من الـ Response (messageId)

---

#### الخطوة 5: جلب الرسائل
```http
GET /api/messages/room/507f1f77bcf86cd799439011
Authorization: Bearer YOUR_TOKEN
```

---

#### الخطوة 6: تحديد رسالة كمقروءة
```http
PATCH /api/messages/507f1f77bcf86cd799439020/read
Authorization: Bearer YOUR_TOKEN
```

---

#### الخطوة 7: إضافة تفاعل
```http
POST /api/messages/507f1f77bcf86cd799439020/reaction
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "emoji": "👍"
}
```

---

#### الخطوة 8: تعديل الرسالة
```http
PUT /api/messages/507f1f77bcf86cd799439020
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "content": "المحتوى المعدل"
}
```

---

#### الخطوة 9: البحث في الرسائل
```http
GET /api/messages/search?roomId=507f1f77bcf86cd799439011&query=مرحباً
Authorization: Bearer YOUR_TOKEN
```

---

#### الخطوة 10: حذف الرسالة
```http
DELETE /api/messages/507f1f77bcf86cd799439020
Authorization: Bearer YOUR_TOKEN
```

---

### سيناريو 2: محادثة مع مرفقات

#### الخطوة 1: إرسال رسالة مع ملف مرفق
```http
POST /api/messages
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data

chatRoomId: 507f1f77bcf86cd799439011
content: هذه رسالة مع ملف مرفق
type: file
attachments: [اختيار ملف - صورة أو PDF]
```

---

### سيناريو 3: الرد على رسالة

#### الخطوة 1: إرسال رسالة رد
```http
POST /api/messages
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "chatRoomId": "507f1f77bcf86cd799439011",
  "content": "هذا رد على الرسالة السابقة",
  "type": "text",
  "replyTo": "507f1f77bcf86cd799439020"
}
```

---

## 📝 Checklist للاختبار

### Chat Rooms
- [ ] جلب جميع غرف الدردشة الخاصة بي
- [ ] جلب غرف الدردشة الخاصة بمشروع معين
- [ ] جلب غرفة دردشة معينة
- [ ] إنشاء غرفة دردشة جديدة (Admin)

### Messages
- [ ] إرسال رسالة نصية
- [ ] إرسال رسالة مع مرفق (صورة)
- [ ] إرسال رسالة مع مرفق (PDF)
- [ ] الرد على رسالة
- [ ] جلب الرسائل مع pagination
- [ ] تحديد رسالة كمقروءة
- [ ] جلب عدد الرسائل غير المقروءة
- [ ] تعديل رسالة
- [ ] حذف رسالة
- [ ] إضافة تفاعل (👍)
- [ ] إضافة تفاعل (❤️)
- [ ] إزالة تفاعل
- [ ] البحث في الرسائل

---

## ⚠️ أخطاء شائعة

### 1. 404 Not Found
```
{
  "message": "غرفة الدردشة غير موجودة"
}
```
**الحل**: تأكدي من أن chatRoomId صحيح

---

### 2. 403 Forbidden
```
{
  "message": "غير مسموح لك بالوصول إلى هذه الغرفة"
}
```
**الحل**: تأكدي من أن المستخدم مشارك في الغرفة

---

### 3. 401 Unauthorized
```
{
  "message": "Authentication error"
}
```
**الحل**: تأكدي من أن الـ token صحيح وغير منتهي

---

### 4. 400 Bad Request
```
{
  "message": "معرف غرفة الدردشة مطلوب"
}
```
**الحل**: تأكدي من إرسال جميع الحقول المطلوبة

---

## 🔍 نصائح للاختبار

1. **استخدام Environment Variables**:
   - `chatRoomId`: احفظي ID الغرفة بعد إنشائها
   - `messageId`: احفظي ID الرسالة بعد إرسالها
   - `projectRoomId`: احفظي ID غرفة المشروع

2. **ترتيب الاختبار**:
   - ابدئي بإنشاء غرفة دردشة
   - ثم أرسلي رسالة
   - ثم جربي باقي العمليات

3. **اختبار مع مستخدمين مختلفين**:
   - سجلي دخول كـ Admin وEngineer وClient
   - اختبري الصلاحيات لكل نوع

4. **اختبار Pagination**:
   - أرسلي عدة رسائل
   - جربي pagination مع `page` و `limit` مختلفة

---

**🎉 جاهز للاختبار!**
