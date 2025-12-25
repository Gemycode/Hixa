# الفلو الكامل والمسارات - Complete Flow & Endpoints

## 🔄 الفلو الكامل للمشروع (Complete Project Flow)

### 1️⃣ إنشاء المشروع (Client)
```
POST /api/projects
Headers: Authorization: Bearer {{clientToken}}
Body:
{
  "title": "مشروع بناء",
  "description": "...",
  "location": "الرياض",
  "projectType": "Construction",
  "budget": { "amount": 50000, "currency": "SAR" }
}
```

**ما يحدث:**
- ✅ المشروع يتم إنشاؤه بـ `status: "Pending Review"`
- ✅ `adminApproval.status: "pending"`

---

### 2️⃣ موافقة/رفض المشروع (Admin)

#### الموافقة:
```
PATCH /api/projects/:projectId/approve
Headers: Authorization: Bearer {{adminToken}}
```

**ما يحدث:**
- ✅ `adminApproval.status` → `"approved"`
- ✅ `status` → `"Waiting for Engineers"`
- ✅ **Notification** → Client يحصل على إشعار بالموافقة ✅

#### الرفض:
```
PATCH /api/projects/:projectId/reject
Headers: Authorization: Bearer {{adminToken}}
Body:
{
  "rejectionReason": "المشروع لا يتوافق مع معاييرنا"
}
```

**ما يحدث:**
- ✅ `adminApproval.status` → `"rejected"`
- ✅ `status` → `"Rejected"`
- ✅ **Notification** → Client يحصل على إشعار بالرفض ✅

---

### 3️⃣ تقديم عرض (Engineer)

```
POST /api/proposals
Headers: Authorization: Bearer {{engineerToken}}
Body:
{
  "projectId": "...",
  "description": "عرض شامل...",
  "estimatedTimeline": "3 أشهر",
  "relevantExperience": "خبرة 5 سنوات",
  "proposedBudget": { "amount": 45000, "currency": "SAR" }
}
```

**ما يحدث تلقائياً:**
- ✅ Proposal يتم إنشاؤه
- ✅ **ProjectRoom** يتم إنشاؤه (إذا لم يكن موجود)
- ✅ **ChatRoom (admin-engineer)** يتم إنشاؤه
- ✅ **ChatRoom (admin-client)** يتم إنشاؤه (إذا لم يكن موجود)
- ✅ **System Messages** يتم إنشاؤها في الغرف
- ✅ **Notifications** → جميع الـ Admins يحصلون على إشعار ✅

---

### 4️⃣ موافقة/رفض العرض (Admin)

#### الموافقة:
```
PUT /api/proposals/:proposalId/status
Headers: Authorization: Bearer {{adminToken}}
Body:
{
  "status": "accepted"
}
```

**ما يحدث:**
- ✅ Proposal status → `"accepted"`
- ✅ Project `assignedEngineer` → Engineer
- ✅ Project `status` → `"In Progress"`
- ✅ جميع العروض الأخرى → `"rejected"`
- ✅ **Group ChatRoom** يتم إنشاؤه (Client + Engineer)
- ✅ **System Message** في Group ChatRoom
- ✅ **Notifications** → Engineer و Client يحصلون على إشعارات ✅

#### الرفض:
```
PUT /api/proposals/:proposalId/status
Headers: Authorization: Bearer {{adminToken}}
Body:
{
  "status": "rejected"
}
```

**ما يحدث:**
- ✅ Proposal status → `"rejected"`
- ✅ **Notification** → Engineer يحصل على إشعار بالرفض ✅

---

### 5️⃣ إرسال رسالة

```
POST /api/messages
Headers: Authorization: Bearer {{token}}
Body:
{
  "chatRoomId": "...",
  "content": "مرحبا!",
  "type": "text"
}
```

**ما يحدث:**
- ✅ Message يتم إنشاؤه
- ✅ ChatRoom `lastMessage` يتم تحديثه
- ✅ ProjectRoom `lastActivityAt` يتم تحديثه
- ✅ **WebSocket** → إرسال Real-time message
- ✅ **Notifications** → جميع المشاركين (ما عدا المرسل) يحصلون على إشعار ✅

---

## 📡 جميع المسارات (All Endpoints)

### 🔐 Authentication
```
POST   /api/auth/register
POST   /api/auth/register/company
POST   /api/auth/register/engineer
POST   /api/auth/register/client
POST   /api/auth/login
PUT    /api/auth/change-password
```

---

### 👥 Users
```
GET    /api/users/me
PUT    /api/users/me
PUT    /api/users/me/change-password
GET    /api/users (Admin)
POST   /api/users (Admin)
GET    /api/users/:id (Admin)
PUT    /api/users/:id (Admin)
DELETE /api/users/:id (Admin)
POST   /api/users/bulk-delete (Admin)
PATCH  /api/users/:id/toggle-activation (Admin)
```

---

### 📋 Projects
```
POST   /api/projects (Client)
GET    /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
POST   /api/projects/:id/attachments
DELETE /api/projects/:id/attachments/:attachmentId
GET    /api/projects/statistics
GET    /api/projects/pending (Admin)
PATCH  /api/projects/:id/approve (Admin) ✅ Notifies Client
PATCH  /api/projects/:id/reject (Admin) ✅ Notifies Client
```

---

### 📝 Proposals
```
POST   /api/proposals (Engineer) ✅ Creates ChatRooms + Notifies Admins
POST   /api/proposals/project/:projectId (Engineer)
GET    /api/proposals/my (Engineer)
GET    /api/proposals/project/:projectId
PUT    /api/proposals/:id
PUT    /api/proposals/:id/status (Admin) ✅ Notifies Engineer/Client
DELETE /api/proposals/:id
```

---

### 💬 Chat Rooms
```
GET    /api/chat-rooms ✅ My Chat Rooms
GET    /api/chat-rooms/:roomId ✅ Chat Room by ID
GET    /api/chat-rooms/project-room/:roomId ✅ Chat Rooms in Project Room
POST   /api/chat-rooms (Admin)
```

---

### 💬 Messages
```
POST   /api/messages ✅ Creates Notification
GET    /api/messages/room/:roomId
PATCH  /api/messages/:messageId/read
GET    /api/messages/unread/count
PUT    /api/messages/:messageId
DELETE /api/messages/:messageId
POST   /api/messages/:messageId/reaction
GET    /api/messages/search
```

---

### 🔔 Notifications
```
GET    /api/notifications ✅ My Notifications
GET    /api/notifications/unread/count ✅ Unread Count
GET    /api/notifications/:id ✅ Notification by ID
PATCH  /api/notifications/:id/read ✅ Mark as Read
PATCH  /api/notifications/read-all ✅ Mark All as Read
DELETE /api/notifications/:id ✅ Delete Notification
DELETE /api/notifications/read/all ✅ Delete All Read
```

---

### 🏢 Project Rooms
```
GET    /api/project-rooms ✅ My Project Rooms
GET    /api/project-rooms/:roomId ✅ Project Room by ID
GET    /api/project-rooms/project/:projectId ✅ Project Room by Project ID
```

---

### 🎨 Portfolio
```
POST   /api/portfolio (Engineer/Admin)
GET    /api/portfolio
GET    /api/portfolio/:id
PUT    /api/portfolio/:id
DELETE /api/portfolio/:id
GET    /api/portfolio/category/:category
GET    /api/portfolio/user/:userId
```

---

### 📦 Service Orders
```
POST   /api/service-orders (Public)
GET    /api/service-orders (Admin)
GET    /api/service-orders/:id (Admin)
PUT    /api/service-orders/:id (Admin)
DELETE /api/service-orders/:id (Admin)
```

---

## 🔄 Flow كامل للاختبار

### Scenario 1: مشروع جديد كامل

1. **Client يإنشئ مشروع:**
   ```
   POST /api/projects
   ```

2. **Admin يوافق على المشروع:**
   ```
   PATCH /api/projects/:projectId/approve
   ```
   ✅ Client يحصل على Notification

3. **Engineer يقدم عرض:**
   ```
   POST /api/proposals
   ```
   ✅ ChatRooms يتم إنشاؤها
   ✅ Admin يحصل على Notification

4. **Engineer يجلب غرفه:**
   ```
   GET /api/chat-rooms
   ```
   ✅ يجب أن يجد ChatRoom

5. **Admin يوافق على العرض:**
   ```
   PUT /api/proposals/:proposalId/status
   Body: { "status": "accepted" }
   ```
   ✅ Group ChatRoom يتم إنشاؤه
   ✅ Engineer و Client يحصلون على Notifications

6. **إرسال رسالة:**
   ```
   POST /api/messages
   Body: { "chatRoomId": "...", "content": "مرحبا" }
   ```
   ✅ المشاركون يحصلون على Notifications

---

## ✅ Checklist للاختبار

### Projects:
- [ ] Create Project (Client)
- [ ] Approve Project (Admin) → Client gets notification ✅
- [ ] Reject Project (Admin) → Client gets notification ✅

### Proposals:
- [ ] Submit Proposal (Engineer) → Creates ChatRooms ✅
- [ ] Submit Proposal → Admin gets notification ✅
- [ ] Accept Proposal (Admin) → Engineer & Client get notifications ✅
- [ ] Reject Proposal (Admin) → Engineer gets notification ✅

### Chat:
- [ ] Get My Chat Rooms → Returns all rooms ✅
- [ ] Get Chat Rooms by Project Room ✅
- [ ] Send Message → Creates notifications ✅

### Notifications:
- [ ] Get Notifications ✅
- [ ] Get Unread Count ✅
- [ ] Mark as Read ✅
- [ ] Delete Notification ✅

---

## 🐛 Debugging Tips

### إذا ChatRooms مش بتتكريت:
1. ✅ تحقق من Console Logs:
   - `Created ProjectRoom for project ...`
   - `Created Admin-Engineer ChatRoom ...`
   - `Created Admin-Client ChatRoom ...`
2. ✅ تحقق من Error في `catch (chatError)`
3. ✅ تأكد أن Project `status` = `"Waiting for Engineers"`
4. ✅ تأكد أن `adminApproval.status` = `"approved"`

### إذا Notifications مش بتوصل:
1. ✅ تحقق من Console Logs:
   - `Error creating notification:` → يشير للمشكلة
2. ✅ تأكد أن `createNotification` يتم استدعاؤها
3. ✅ تحقق من WebSocket (لـ Real-time)
4. ✅ تأكد أن User موجود في `participants` أو `engineer` field

---

**📝 تم إضافة Notifications في:**
- ✅ Proposal Creation → Notifies Admins
- ✅ Proposal Accepted → Notifies Engineer & Client
- ✅ Proposal Rejected → Notifies Engineer
- ✅ Project Approved → Notifies Client
- ✅ Project Rejected → Notifies Client
- ✅ Message Sent → Notifies Participants

**📝 تم التحقق من ChatRooms Creation:**
- ✅ يتم إنشاؤها عند Proposal Creation
- ✅ يتم إنشاؤها عند Proposal Acceptance (Group Chat)
