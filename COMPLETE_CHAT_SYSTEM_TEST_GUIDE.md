# دليل اختبار نظام الشات الكامل - Complete Chat System Test Guide

## 🎯 نظرة عامة

هذا الدليل يغطي الفلو الكامل لنظام الشات من البداية إلى النهاية، مع جميع الميزات الأساسية والتحسينات معاً.

---

## 🔐 التحضير: الحصول على Tokens

### 1. تسجيل الدخول كـ Admin
```
POST /api/auth/login
Body: {
  "email": "admin@example.com",
  "password": "password"
}
```
**احفظ**: `adminToken`

---

### 2. تسجيل الدخول كـ Client
```
POST /api/auth/login
Body: {
  "email": "client@example.com",
  "password": "password"
}
```
**احفظ**: `clientToken`

---

### 3. تسجيل الدخول كـ Engineer 1
```
POST /api/auth/login
Body: {
  "email": "engineer1@example.com",
  "password": "password"
}
```
**احفظ**: `engineer1Token`

---

### 4. تسجيل الدخول كـ Engineer 2
```
POST /api/auth/login
Body: {
  "email": "engineer2@example.com",
  "password": "password"
}
```
**احفظ**: `engineer2Token`

---

## 📋 السيناريو الكامل

---

## ✅ المرحلة 1: إنشاء المشروع وموافقته

### Step 1.1: Client ينشئ مشروع

```
POST /api/projects
Headers: Authorization: Bearer {{clientToken}}
Body: {
  "title": "مشروع تصميم منزل",
  "description": "أريد تصميم منزل عصري",
  "country": "مصر",
  "city": "القاهرة",
  "budget": 500000,
  "deadline": "2024-12-31"
}
```

**Expected**: ✅ 201 Created
```json
{
  "message": "تم إنشاء المشروع بنجاح",
  "data": {
    "id": "projectId1",
    "status": "Pending Review",
    ...
  }
}
```

**احفظ**: `projectId1`

---

### Step 1.2: Admin يوافق على المشروع

```
PUT /api/projects/{{projectId1}}/approve
Headers: Authorization: Bearer {{adminToken}}
Body: {
  "notes": "مشروع ممتاز"
}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم الموافقة على المشروع بنجاح",
  "data": {
    "status": "Waiting for Engineers",
    "adminApproval": {
      "status": "approved",
      ...
    }
  }
}
```

---

## ✅ المرحلة 2: تقديم Proposals وإنشاء ChatRooms تلقائياً

### Step 2.1: Engineer 1 يقدم Proposal

```
POST /api/proposals
Headers: Authorization: Bearer {{engineer1Token}}
Body: {
  "projectId": "{{projectId1}}",
  "description": "لدي خبرة 5 سنوات في التصميم",
  "estimatedTimeline": "3 أشهر",
  "relevantExperience": "صممت 10 منازل",
  "proposedBudget": 450000
}
```

**Expected**: ✅ 201 Created
```json
{
  "message": "تم تقديم العرض بنجاح",
  "data": {
    "id": "proposalId1",
    "status": "pending",
    ...
  }
}
```

**يتم تلقائياً:**
- ✅ إنشاء ProjectRoom للمشروع
- ✅ إنشاء ChatRoom (admin-engineer) بين Admin و Engineer 1
- ✅ إنشاء ChatRoom (admin-client) بين Admin و Client
- ✅ إرسال System Messages

**احفظ**: `proposalId1`

---

### Step 2.2: Engineer 2 يقدم Proposal على نفس المشروع

```
POST /api/proposals
Headers: Authorization: Bearer {{engineer2Token}}
Body: {
  "projectId": "{{projectId1}}",
  "description": "لدي خبرة 8 سنوات",
  "estimatedTimeline": "2 شهر",
  "relevantExperience": "صممت 20 منزل",
  "proposedBudget": 480000
}
```

**Expected**: ✅ 201 Created

**يتم تلقائياً:**
- ✅ إنشاء ChatRoom (admin-engineer) بين Admin و Engineer 2
- ✅ ProjectRoom موجود بالفعل (لا يتم إنشاء جديد)

**احفظ**: `proposalId2`

---

## ✅ المرحلة 3: Dashboard - عرض ProjectRooms

### Step 3.1: Engineer 1 يرى ProjectRooms الخاصة به

```
GET /api/project-rooms
Headers: Authorization: Bearer {{engineer1Token}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": [
    {
      "_id": "projectRoomId1",
      "project": {
        "_id": "projectId1",
        "title": "مشروع تصميم منزل",
        "status": "Waiting for Engineers"
      },
      "projectTitle": "مشروع تصميم منزل",
      "unreadCount": 1,  // ✅ System message
      "lastActivityAt": "...",
      "status": "active"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    ...
  }
}
```

**احفظ**: `projectRoomId1`

---

### Step 3.2: Client يرى ProjectRooms الخاصة به

```
GET /api/project-rooms
Headers: Authorization: Bearer {{clientToken}}
```

**Expected**: ✅ 200 OK - ProjectRoom واحد فقط

---

### Step 3.3: Admin يرى جميع ProjectRooms

```
GET /api/project-rooms
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK - جميع ProjectRooms

---

## ✅ المرحلة 4: عرض ChatRooms داخل ProjectRoom

### Step 4.1: Engineer 1 يرى ChatRooms الخاصة به

```
GET /api/chat-rooms/project-room/{{projectRoomId1}}
Headers: Authorization: Bearer {{engineer1Token}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": [
    {
      "_id": "chatRoomId1",
      "type": "admin-engineer",
      "project": {...},
      "engineer": {...},
      "participants": [
        {
          "user": {
            "_id": "engineer1Id",
            "name": "Engineer 1",
            "role": "engineer"
          },
          "role": "engineer"
        }
      ],
      "lastMessage": {
        "content": "قام المهندس Engineer 1 بتقديم عرض...",
        "sender": {...},
        "createdAt": "..."
      },
      "unreadCount": 1,  // ✅ System message
      "status": "active"
    }
  ]
}
```

**ملاحظة**: Engineer 1 يرى فقط ChatRoom الخاص به مع Admin (لا يرى Engineer 2)

**احفظ**: `chatRoomId1` (admin-engineer for engineer 1)

---

### Step 4.2: Client يرى ChatRooms الخاصة به

```
GET /api/chat-rooms/project-room/{{projectRoomId1}}
Headers: Authorization: Bearer {{clientToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": [
    {
      "_id": "chatRoomId2",
      "type": "admin-client",
      "participants": [
        {
          "user": {
            "_id": "clientId",
            "name": "Client",
            "role": "client"
          },
          "role": "client"
        }
      ],
      "lastMessage": {
        "content": "قام المهندس Engineer 1 بتقديم عرض...",
        ...
      },
      "unreadCount": 1,  // ✅ System message
      "status": "active"
    }
  ]
}
```

**ملاحظة**: Client يرى فقط ChatRoom مع Admin (لا يرى المهندسين)

**احفظ**: `chatRoomId2` (admin-client)

---

### Step 4.3: Admin يرى جميع ChatRooms

```
GET /api/chat-rooms/project-room/{{projectRoomId1}}
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": [
    {
      "_id": "chatRoomId1",
      "type": "admin-engineer",
      "engineer": {
        "_id": "engineer1Id",
        "name": "Engineer 1"
      },
      ...
    },
    {
      "_id": "chatRoomId3",
      "type": "admin-engineer",
      "engineer": {
        "_id": "engineer2Id",
        "name": "Engineer 2"
      },
      ...
    },
    {
      "_id": "chatRoomId2",
      "type": "admin-client",
      ...
    }
  ]
}
```

**ملاحظة**: Admin يرى جميع ChatRooms (مع كل مهندس + مع العميل)

**احفظ**: `chatRoomId3` (admin-engineer for engineer 2)

---

## ✅ المرحلة 5: عرض الرسائل (Messages)

### Step 5.1: Engineer 1 يرى الرسائل في ChatRoom

```
GET /api/messages/room/{{chatRoomId1}}
Headers: Authorization: Bearer {{engineer1Token}}
Query: ?page=1&limit=50
```

**Expected**: ✅ 200 OK
```json
{
  "data": [
    {
      "_id": "messageId1",
      "content": "قام المهندس Engineer 1 بتقديم عرض على المشروع \"مشروع تصميم منزل\". يرجى التواصل معه لإجراء مقابلة.",
      "type": "system",
      "sender": {
        "_id": "systemUserId",
        "name": "System",
        "role": "system"
      },
      "createdAt": "..."
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    ...
  }
}
```

---

### Step 5.2: Client يرى الرسائل في ChatRoom

```
GET /api/messages/room/{{chatRoomId2}}
Headers: Authorization: Bearer {{clientToken}}
```

**Expected**: ✅ 200 OK - System message عن Proposal Engineer 1

---

## ✅ المرحلة 6: إرسال الرسائل

### Step 6.1: Admin يرسل رسالة لـ Engineer 1

```
POST /api/messages
Headers: Authorization: Bearer {{adminToken}}
Body: {
  "chatRoomId": "{{chatRoomId1}}",
  "content": "مرحباً، هل يمكنك التواصل غداً لعمل مقابلة؟"
}
```

**Expected**: ✅ 201 Created
```json
{
  "success": true,
  "message": "تم إرسال الرسالة بنجاح",
  "data": {
    "_id": "messageId2",
    "content": "مرحباً، هل يمكنك التواصل غداً لعمل مقابلة؟",
    "sender": {
      "_id": "adminId",
      "name": "Admin",
      "role": "admin"
    },
    "createdAt": "..."
  }
}
```

**تحديثات تلقائية:**
- ✅ `lastMessage` في ChatRoom
- ✅ `lastActivityAt` في ProjectRoom
- ✅ Notification لـ Engineer 1

**احفظ**: `messageId2`

---

### Step 6.2: Engineer 1 يرى الرسالة الجديدة

```
GET /api/chat-rooms/{{chatRoomId1}}
Headers: Authorization: Bearer {{engineer1Token}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "lastMessage": {
      "content": "مرحباً، هل يمكنك التواصل غداً لعمل مقابلة؟",
      "sender": {...},
      "createdAt": "..."
    },
    "unreadCount": 1  // ✅ رسالة Admin غير مقروءة
  }
}
```

---

### Step 6.3: Engineer 1 يقرأ الرسالة

```
PATCH /api/messages/{{messageId2}}/read
Headers: Authorization: Bearer {{engineer1Token}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم تحديث حالة القراءة بنجاح"
}
```

---

### Step 6.4: Engineer 1 يرد على Admin

```
POST /api/messages
Headers: Authorization: Bearer {{engineer1Token}}
Body: {
  "chatRoomId": "{{chatRoomId1}}",
  "content": "نعم بالطبع، أنا متاح غداً في الساعة 2 مساءً"
}
```

**Expected**: ✅ 201 Created

---

### Step 6.5: Admin يرى Unread Count

```
GET /api/chat-rooms/{{chatRoomId1}}/unread-count
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "chatRoomId": "{{chatRoomId1}}",
    "unreadCount": 1  // ✅ رسالة Engineer 1
  }
}
```

---

### Step 6.6: Admin يرسل رسالة للعميل

```
POST /api/messages
Headers: Authorization: Bearer {{adminToken}}
Body: {
  "chatRoomId": "{{chatRoomId2}}",
  "content": "مرحباً، لدينا مهندس ممتاز قدم عرض على مشروعك. سأتواصل معه لعمل مقابلة."
}
```

**Expected**: ✅ 201 Created

---

## ✅ المرحلة 7: Unread Count System

### Step 7.1: Engineer 1 يرى Unread Count في ProjectRoom

```
GET /api/project-rooms/{{projectRoomId1}}/unread-count
Headers: Authorization: Bearer {{engineer1Token}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "projectRoomId": "{{projectRoomId1}}",
    "unreadCount": 1  // ✅ رسالة جديدة من Admin
  }
}
```

---

### Step 7.2: Engineer 1 يرى جميع ChatRooms مع Unread Count

```
GET /api/chat-rooms
Headers: Authorization: Bearer {{engineer1Token}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": [
    {
      "_id": "chatRoomId1",
      "unreadCount": 1,  // ✅ Unread count لكل ChatRoom
      "lastMessage": {...},
      ...
    }
  ]
}
```

---

## ✅ المرحلة 8: التوظيف وإنشاء Group Chat

### Step 8.1: Admin يوظف Engineer 1

```
PUT /api/projects/{{projectId1}}
Headers: Authorization: Bearer {{adminToken}}
Body: {
  "assignedEngineer": "engineer1Id",
  "status": "In Progress"
}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم تحديث المشروع بنجاح",
  "data": {
    "assignedEngineer": "engineer1Id",
    "status": "In Progress",
    ...
  }
}
```

**يتم تلقائياً:**
- ✅ إنشاء ChatRoom نوع "group" (إذا لم يكن موجود)
- ✅ إضافة participants: Client, Engineer 1
- ✅ إرسال System message عن التوظيف

**ملاحظة**: يمكن أيضاً استخدام `PUT /api/proposals/{{proposalId}}/status` مع `status: "accepted"` وهذا أيضاً ينشئ Group ChatRoom تلقائياً

---

### Step 8.2: جميع المشاركين يرون Group ChatRoom

```
GET /api/chat-rooms/project-room/{{projectRoomId1}}
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK - Group ChatRoom موجود

```
GET /api/chat-rooms/project-room/{{projectRoomId1}}
Headers: Authorization: Bearer {{engineer1Token}}
```

**Expected**: ✅ 200 OK - Group ChatRoom موجود

```
GET /api/chat-rooms/project-room/{{projectRoomId1}}
Headers: Authorization: Bearer {{clientToken}}
```

**Expected**: ✅ 200 OK - Group ChatRoom موجود

---

### Step 8.3: إرسال رسالة في Group Chat

```
POST /api/messages
Headers: Authorization: Bearer {{clientToken}}
Body: {
  "chatRoomId": "{{groupChatRoomId}}",
  "content": "مرحباً جميعاً، أريد أن نبدأ في التصميم"
}
```

**Expected**: ✅ 201 Created

---

## ✅ المرحلة 9: Search & Filtering

### Step 9.1: Engineer 1 يبحث في ChatRooms

```
GET /api/chat-rooms?search=منزل
Headers: Authorization: Bearer {{engineer1Token}}
```

**Expected**: ✅ 200 OK - ChatRooms تحتوي على "منزل"

---

### Step 9.2: Engineer 1 يفلتر حسب Type

```
GET /api/chat-rooms?type=admin-engineer
Headers: Authorization: Bearer {{engineer1Token}}
```

**Expected**: ✅ 200 OK - فقط admin-engineer ChatRooms

---

### Step 9.3: Admin يرى Archived Rooms

```
GET /api/chat-rooms?status=archived
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK - فقط archived ChatRooms

---

## ✅ المرحلة 10: Archive/Close Management

### Step 10.1: Admin يرشف ChatRoom

```
PATCH /api/chat-rooms/{{chatRoomId3}}/archive
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم أرشفة الغرفة بنجاح",
  "data": {
    "status": "archived",
    ...
  }
}
```

---

### Step 10.2: التحقق أن Archived Room لا يظهر في القائمة العادية

```
GET /api/chat-rooms
Headers: Authorization: Bearer {{engineer2Token}}
```

**Expected**: ✅ 200 OK - Archived room لا يظهر

---

### Step 10.3: Admin يرى Archived Room

```
GET /api/chat-rooms?status=archived
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK - Archived room يظهر

---

### Step 10.4: Admin يعيد فتح Archived Room

```
PATCH /api/chat-rooms/{{chatRoomId3}}/unarchive
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم إلغاء أرشفة الغرفة بنجاح",
  "data": {
    "status": "active",
    ...
  }
}
```

---

### Step 10.5: Admin يغلق ProjectRoom

```
PATCH /api/project-rooms/{{projectRoomId1}}/close
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم إغلاق غرفة المشروع بنجاح",
  "data": {
    "status": "closed",
    "closedAt": "..."
  }
}
```

---

### Step 10.6: Admin يعيد فتح ProjectRoom

```
PATCH /api/project-rooms/{{projectRoomId1}}/reopen
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم إعادة فتح غرفة المشروع بنجاح",
  "data": {
    "status": "active",
    "closedAt": null
  }
}
```

---

## ✅ المرحلة 11: Participants Management

### Step 11.1: Admin يضيف Participant جديد

```
POST /api/chat-rooms/{{groupChatRoomId}}/participants
Headers: Authorization: Bearer {{adminToken}}
Body: {
  "userId": "engineer2Id",
  "role": "engineer"
}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم إضافة المشارك بنجاح",
  "data": {
    "participants": [
      {...},
      {
        "user": {
          "_id": "engineer2Id",
          "name": "Engineer 2"
        },
        "role": "engineer",
        "joinedAt": "..."
      }
    ]
  }
}
```

---

### Step 11.2: Admin يزيل Participant

```
DELETE /api/chat-rooms/{{groupChatRoomId}}/participants/{{engineer2Id}}
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم إزالة المشارك بنجاح",
  "data": {
    "participants": [...]
  }
}
```

---

## ✅ المرحلة 12: Statistics

### Step 12.1: Admin يرى ChatRoom Statistics

```
GET /api/chat-rooms/statistics
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "total": 5,
    "active": 4,
    "archived": 1,
    "byType": {
      "adminEngineer": 2,
      "adminClient": 1,
      "group": 1
    }
  }
}
```

---

### Step 12.2: Admin يرى ProjectRoom Statistics

```
GET /api/project-rooms/statistics
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "total": 3,
    "active": 2,
    "closed": 1
  }
}
```

---

## ✅ المرحلة 13: Delete ChatRoom

### Step 13.1: Admin يحذف ChatRoom

```
DELETE /api/chat-rooms/{{chatRoomId3}}
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم حذف الغرفة بنجاح"
}
```

**ملاحظة**: Soft delete (status = "archived")

---

## 🔄 سيناريو متكامل كامل

### السيناريو الكامل خطوة بخطوة:

1. ✅ Client ينشئ مشروع
2. ✅ Admin يوافق على المشروع
3. ✅ Engineer 1 يقدم Proposal → Auto-create ProjectRoom & ChatRooms
4. ✅ Engineer 2 يقدم Proposal → Auto-create ChatRoom
5. ✅ Admin يرسل رسالة لـ Engineer 1
6. ✅ Engineer 1 يرد على Admin
7. ✅ Unread Count يعمل بشكل صحيح
8. ✅ Admin يوظف Engineer 1 → Group ChatRoom
9. ✅ إرسال رسائل في Group Chat
10. ✅ Search & Filtering
11. ✅ Archive/Close Management
12. ✅ Participants Management
13. ✅ Statistics
14. ✅ Delete ChatRoom

---

## 📊 Checklist شامل

### الأساسيات:
- [ ] إنشاء مشروع وموافقته
- [ ] تقديم Proposal وإنشاء ChatRooms تلقائياً
- [ ] عرض ProjectRooms لكل role
- [ ] عرض ChatRooms داخل ProjectRoom
- [ ] عرض Messages في ChatRoom
- [ ] إرسال Messages

### Unread Count:
- [ ] Unread count في ChatRoom
- [ ] Unread count في ProjectRoom
- [ ] Unread count يتحدث بعد القراءة
- [ ] Unread count في getAll endpoints

### Archive/Close:
- [ ] Archive ChatRoom
- [ ] Unarchive ChatRoom
- [ ] Close ProjectRoom
- [ ] Reopen ProjectRoom
- [ ] Archived rooms لا تظهر في القائمة العادية

### Participants:
- [ ] Add participant
- [ ] Remove participant
- [ ] Validation

### Search & Filter:
- [ ] Search في ChatRooms
- [ ] Filter by type
- [ ] Filter by status (Admin)

### Statistics:
- [ ] ChatRoom statistics
- [ ] ProjectRoom statistics

### Delete:
- [ ] Delete ChatRoom (soft delete)

---

## ⚠️ ملاحظات مهمة

1. **Auto-creation**: عند تقديم Proposal، يتم إنشاء ProjectRoom و ChatRooms تلقائياً
2. **Permissions**: كل role يرى فقط ChatRooms الخاصة به
3. **System Messages**: يتم إرسالها تلقائياً عند أحداث معينة
4. **Unread Count**: يتم حسابه ديناميكياً بناءً على `lastReadAt`
5. **Archive**: Soft delete (status = "archived")

---

**⏱️ الوقت المتوقع**: 45-60 دقيقة للاختبار الكامل

**📝 تاريخ الدليل**: ${new Date().toLocaleString('ar-SA')}
