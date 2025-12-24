# دليل اختبار الـ API - API Testing Guide

## 📌 معلومات أساسية

**Base URL**: `http://localhost:5000/api` أو `https://hixa.onrender.com/api` (أو أي port/domain تستخدمينه)

**Content-Type**: `application/json`

---

## 🔐 خطوة 1: المصادقة (Authentication)

### 1.1 تسجيل مستخدم جديد
```
POST /api/auth/register
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "test@example.com",
  "password": "Test123456",
  "name": "Test User",
  "role": "customer"
}
```

**الأدوار المتاحة**: `customer`, `client`, `engineer`, `admin`

**Response:**
```json
{
  "message": "تم التسجيل بنجاح",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

**⚠️ مهم**: احفظي الـ `token` لأنك ستحتاجينه في كل الطلبات التالية!

---

### 1.2 تسجيل الدخول
```
POST /api/auth/login
```

**Body:**
```json
{
  "email": "test@example.com",
  "password": "Test123456"
}
```

**Response:**
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { ... }
}
```

---

## 👤 خطوة 2: نظام المستخدمين (User System)

### 2.1 جلب الملف الشخصي
```
GET /api/users/me
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

### 2.2 تحديث الملف الشخصي
```
PUT /api/users/me
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: multipart/form-data
```

**Body (Form Data):**
- `name` (optional): "Updated Name"
- `email` (optional): "newemail@example.com"
- `phone` (optional): "01234567890"
- `bio` (optional): "My bio"
- `avatar` (optional): ملف صورة

---

### 2.3 تغيير كلمة المرور
```
PUT /api/users/me/change-password
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123",
  "confirmNewPassword": "NewPassword123"
}
```

---

### 2.4 جلب جميع المستخدمين (Admin فقط)
```
GET /api/users?page=1&limit=10&role=engineer&search=test
```

**Query Parameters:**
- `page` (optional): رقم الصفحة
- `limit` (optional): عدد النتائج (default: 10, max: 100)
- `role` (optional): `admin`, `engineer`, `client`, `customer`
- `search` (optional): البحث في الاسم أو البريد
- `isActive` (optional): `true` أو `false`

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN_HERE
```

---

### 2.5 إنشاء مستخدم جديد (Admin فقط)
```
POST /api/users
```

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN_HERE
Content-Type: application/json
```

**Body:**
```json
{
  "email": "newuser@example.com",
  "password": "Password123",
  "name": "New User",
  "role": "engineer",
  "phone": "01234567890",
  "nationalId": "12345678901234"
}
```

---

### 2.6 تفعيل/إلغاء تفعيل مستخدم (Admin فقط)
```
PATCH /api/users/:id/toggle-activation
```

**Headers:**
```
Authorization: Bearer ADMIN_TOKEN_HERE
```

---

## 💬 خطوة 3: نظام الشات (Chat System)

### 3.1 غرف الشات (Chat Rooms)

#### 3.1.1 جلب غرف الشات الخاصة بي
```
GET /api/chat-rooms
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

#### 3.1.2 جلب غرف الشات الخاصة بمشروع معين
```
GET /api/chat-rooms/project-room/:projectRoomId
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Example:**
```
GET /api/chat-rooms/project-room/507f1f77bcf86cd799439011
```

---

#### 3.1.3 جلب غرفة شات معينة
```
GET /api/chat-rooms/:roomId
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

---

#### 3.1.4 إنشاء غرفة شات جديدة (Admin فقط)
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
  "project": "507f1f77bcf86cd799439011",
  "projectRoom": "507f1f77bcf86cd799439012",
  "type": "admin-engineer",
  "engineer": "507f1f77bcf86cd799439013"
}
```

**أنواع الغرف:**
- `admin-engineer`: محادثة بين admin و engineer
- `admin-client`: محادثة بين admin و client
- `group`: محادثة جماعية

---

### 3.2 الرسائل (Messages)

#### 3.2.1 إرسال رسالة جديدة
```
POST /api/messages
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: multipart/form-data
```

**Body (Form Data):**
- `chatRoomId` (required): معرف غرفة الشات
- `content` (optional): محتوى الرسالة النصي
- `type` (optional): `text` (default) أو `file` أو `system`
- `replyTo` (optional): معرف الرسالة المراد الرد عليها
- `attachments` (optional): ملفات مرفقة (يمكن إرسال أكثر من ملف)

**Example (Postman/API Dog):**
- Key: `chatRoomId`, Value: `507f1f77bcf86cd799439011`
- Key: `content`, Value: `مرحباً، هذه رسالة تجريبية`
- Key: `replyTo` (optional), Value: `507f1f77bcf86cd799439014`
- Key: `attachments`, Type: File, Value: [اختيار ملف]

**Example (JSON - بدون ملفات):**
```
POST /api/messages
Content-Type: application/json
```

```json
{
  "chatRoomId": "507f1f77bcf86cd799439011",
  "content": "مرحباً، هذه رسالة تجريبية",
  "type": "text"
}
```

---

#### 3.2.2 جلب رسائل غرفة معينة
```
GET /api/messages/room/:roomId?page=1&limit=20
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

---

#### 3.2.3 تحديد رسالة كمقروءة
```
PATCH /api/messages/:messageId/read
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Example:**
```
PATCH /api/messages/507f1f77bcf86cd799439014/read
```

---

#### 3.2.4 جلب عدد الرسائل غير المقروءة
```
GET /api/messages/unread/count
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Response:**
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

#### 3.2.5 تعديل رسالة
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

**⚠️ ملاحظة**: يمكن فقط للمرسل أو Admin تعديل الرسالة

---

#### 3.2.6 حذف رسالة
```
DELETE /api/messages/:messageId
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**⚠️ ملاحظة**: حذف ناعم (soft delete) - يمكن فقط للمرسل أو Admin حذف الرسالة

---

#### 3.2.7 إضافة/إزالة تفاعل (Reaction)
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

**Response:**
- إذا كان التفاعل موجود: يتم إزالته
- إذا كان غير موجود: يتم إضافته

---

#### 3.2.8 البحث في الرسائل
```
GET /api/messages/search?roomId=507f1f77bcf86cd799439011&query=نص البحث&page=1&limit=20
```

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
```

**Query Parameters:**
- `roomId` (required): معرف غرفة الشات
- `query` (required): نص البحث
- `page` (optional): رقم الصفحة
- `limit` (optional): عدد النتائج

---

## 🧪 سيناريوهات الاختبار الموصى بها

### سيناريو 1: إنشاء محادثة كاملة

1. ✅ تسجيل دخول كمستخدمين مختلفين (مستخدم 1، مستخدم 2)
2. ✅ إنشاء غرفة شات (Admin فقط) أو استخدام غرفة موجودة
3. ✅ المستخدم 1 يرسل رسالة نصية
4. ✅ المستخدم 2 يجلب الرسائل
5. ✅ المستخدم 2 يرد على الرسالة
6. ✅ المستخدم 1 يحدد الرسائل كمقروءة
7. ✅ التحقق من عدد الرسائل غير المقروءة

---

### سيناريو 2: الملفات المرفقة

1. ✅ إرسال رسالة مع ملف مرفق (صورة)
2. ✅ إرسال رسالة مع ملف PDF
3. ✅ جلب الرسائل والتحقق من المرفقات

---

### سيناريو 3: التفاعلات والردود

1. ✅ إرسال رسالة
2. ✅ الرد على الرسالة (`replyTo`)
3. ✅ إضافة تفاعل 👍
4. ✅ إضافة تفاعل ❤️
5. ✅ إزالة تفاعل (إرسال نفس التفاعل مرة أخرى)
6. ✅ جلب الرسائل مع populate للردود والتفاعلات

---

### سيناريو 4: تعديل وحذف

1. ✅ إرسال رسالة
2. ✅ تعديل الرسالة
3. ✅ التحقق من `isEdited: true`
4. ✅ حذف الرسالة
5. ✅ التحقق من أن الرسالة لا تظهر في القائمة (`isDeleted: false` filter)

---

### سيناريو 5: البحث

1. ✅ إرسال عدة رسائل بنصوص مختلفة
2. ✅ البحث عن نص معين
3. ✅ التحقق من النتائج

---

## 🔍 نصائح للاختبار

### في Postman/API Dog:

1. **إنشاء Environment**:
   - `base_url`: `http://localhost:5000/api`
   - `token`: سيتم تحديثه تلقائياً

2. **استخدام Variables**:
   - بعد تسجيل الدخول، احفظي `token` في variable
   - استخدمي `{{token}}` في Authorization header

3. **Collection Organization**:
   - أنشئي folder لكل نظام (Auth, Users, Chat Rooms, Messages)
   - رتبي الطلبات حسب الترتيب المنطقي

4. **Pre-request Scripts** (لـ Postman):
   ```javascript
   // تلقائياً يضيف Authorization header
   pm.request.headers.add({
       key: 'Authorization',
       value: 'Bearer ' + pm.environment.get('token')
   });
   ```

5. **Tests Scripts** (لـ Postman):
   ```javascript
   // حفظ token تلقائياً بعد login
   if (pm.response.code === 200) {
       const response = pm.response.json();
       if (response.token) {
           pm.environment.set('token', response.token);
       }
   }
   ```

---

## ⚠️ أخطاء شائعة

1. **401 Unauthorized**: 
   - تحققي من أن الـ token صحيح
   - تحققي من أن Token غير منتهي الصلاحية

2. **403 Forbidden**:
   - تحققي من أن المستخدم لديه الصلاحيات المطلوبة
   - بعض المسارات تتطلب role معين (Admin, Engineer, etc.)

3. **404 Not Found**:
   - تحققي من معرفات الـ IDs (MongoDB ObjectId)
   - تحققي من المسار الصحيح

4. **400 Bad Request**:
   - تحققي من البيانات المرسلة (validation)
   - تحققي من Content-Type

5. **413 Payload Too Large**:
   - حجم الملف كبير جداً
   - الحد الأقصى: 5MB للصور، 50MB للملفات الأخرى

---

## 📝 Checklist للاختبار

### نظام المصادقة
- [ ] تسجيل مستخدم جديد
- [ ] تسجيل الدخول
- [ ] Token يعمل مع المسارات المحمية

### نظام المستخدمين
- [ ] جلب الملف الشخصي
- [ ] تحديث الملف الشخصي
- [ ] تغيير كلمة المرور
- [ ] جلب قائمة المستخدمين (Admin)
- [ ] إنشاء مستخدم (Admin)
- [ ] تفعيل/إلغاء تفعيل (Admin)

### نظام الشات
- [ ] جلب غرف الشات الخاصة بي
- [ ] جلب غرفة معينة
- [ ] إرسال رسالة نصية
- [ ] إرسال رسالة مع مرفق
- [ ] الرد على رسالة
- [ ] جلب الرسائل مع pagination
- [ ] تحديد رسالة كمقروءة
- [ ] جلب عدد الرسائل غير المقروءة
- [ ] تعديل رسالة
- [ ] حذف رسالة
- [ ] إضافة تفاعل
- [ ] إزالة تفاعل
- [ ] البحث في الرسائل

---

**🎉 بالتوفيق في الاختبار!**

إذا واجهت أي مشاكل، تحققي من:
1. الـ Base URL صحيح
2. الـ Token صالح وغير منتهي
3. معرفات الـ IDs صحيحة (MongoDB ObjectId format)
4. البيانات المرسلة تطابق الـ Schema
