# الفلو الكامل للنظام - Complete System Flow

## 🎯 الفلو الكامل من البداية للنهاية

---

## 1️⃣ إنشاء المشروع (Client)

### Request:
```
POST /api/projects
Headers: Authorization: Bearer {{clientToken}}
Body:
{
  "title": "بناء فيلا",
  "description": "...",
  "location": "الرياض",
  "projectType": "Construction",
  "budget": { "amount": 100000, "currency": "SAR" }
}
```

### Response:
```json
{
  "message": "تم إنشاء المشروع بنجاح",
  "data": {
    "id": "projectId123",
    "status": "Pending Review",
    "adminApproval": {
      "status": "pending"
    }
  }
}
```

### ما يحدث:
- ✅ Project يتم إنشاؤه
- ✅ `status: "Pending Review"`
- ✅ `adminApproval.status: "pending"`

---

## 2️⃣ موافقة على المشروع (Admin)

### Request:
```
PATCH /api/projects/{{projectId}}/approve
Headers: Authorization: Bearer {{adminToken}}
```

### Response:
```json
{
  "message": "تم الموافقة على المشروع بنجاح",
  "data": {
    "status": "Waiting for Engineers",
    "adminApproval": {
      "status": "approved"
    }
  }
}
```

### ما يحدث:
- ✅ `adminApproval.status` → `"approved"`
- ✅ `status` → `"Waiting for Engineers"`
- ✅ **Notification** → Client يحصل على إشعار ✅

### للتحقق:
```
GET /api/notifications
Headers: Authorization: Bearer {{clientToken}}
```
يجب أن تجد notification من نوع `"project_approved"`

---

## 3️⃣ تقديم عرض (Engineer)

### Request:
```
POST /api/proposals
Headers: Authorization: Bearer {{engineerToken}}
Body:
{
  "projectId": "{{projectId}}",
  "description": "عرض شامل...",
  "estimatedTimeline": "6 أشهر",
  "relevantExperience": "خبرة 10 سنوات",
  "proposedBudget": { "amount": 95000, "currency": "SAR" }
}
```

### Response:
```json
{
  "message": "تم إرسال العرض بنجاح",
  "data": {
    "id": "proposalId123",
    "status": "pending"
  }
}
```

### ما يحدث تلقائياً:
1. ✅ **Proposal** يتم إنشاؤه
2. ✅ **ProjectRoom** يتم إنشاؤه (إذا لم يكن موجود)
3. ✅ **ChatRoom (admin-engineer)** يتم إنشاؤه
4. ✅ **ChatRoom (admin-client)** يتم إنشاؤه (إذا لم يكن موجود)
5. ✅ **System Messages** يتم إنشاؤها في الغرف
6. ✅ **Notifications** → جميع الـ Admins يحصلون على إشعار ✅

### Console Logs المتوقعة:
```
✅ Created ProjectRoom for project ... (projectRoomId)
✅ Created Admin-Engineer ChatRoom for project ... (chatRoomId)
✅ Created Admin-Client ChatRoom for project ... (chatRoomId)
✅ Created X notification(s) for admins about new proposal
```

### للتحقق:

#### 1. جلب Chat Rooms:
```
GET /api/chat-rooms
Headers: Authorization: Bearer {{engineerToken}}
```
يجب أن تجد ChatRoom من نوع `"admin-engineer"`

#### 2. جلب Notifications (Admin):
```
GET /api/notifications
Headers: Authorization: Bearer {{adminToken}}
```
يجب أن تجد notification من نوع `"proposal_submitted"`

---

## 4️⃣ موافقة على العرض (Admin)

### Request:
```
PUT /api/proposals/{{proposalId}}/status
Headers: Authorization: Bearer {{adminToken}}
Body:
{
  "status": "accepted"
}
```

### Response:
```json
{
  "message": "تم تحديث حالة العرض",
  "data": {
    "status": "accepted"
  }
}
```

### ما يحدث:
1. ✅ Proposal status → `"accepted"`
2. ✅ Project `assignedEngineer` → Engineer ID
3. ✅ Project `status` → `"In Progress"`
4. ✅ جميع العروض الأخرى → `"rejected"`
5. ✅ **Group ChatRoom** يتم إنشاؤه (Client + Engineer)
6. ✅ **System Message** في Group ChatRoom
7. ✅ **Notifications** → Engineer و Client يحصلون على إشعارات ✅

### للتحقق:

#### 1. جلب Chat Rooms (Engineer):
```
GET /api/chat-rooms
Headers: Authorization: Bearer {{engineerToken}}
```
يجب أن تجد Group ChatRoom

#### 2. جلب Notifications (Engineer):
```
GET /api/notifications
Headers: Authorization: Bearer {{engineerToken}}
```
يجب أن تجد notification من نوع `"proposal_accepted"`

#### 3. جلب Notifications (Client):
```
GET /api/notifications
Headers: Authorization: Bearer {{clientToken}}
```
يجب أن تجد notification من نوع `"project_status_changed"`

---

## 5️⃣ إرسال رسالة

### Request:
```
POST /api/messages
Headers: Authorization: Bearer {{engineerToken}}
Body:
{
  "chatRoomId": "{{chatRoomId}}",
  "content": "مرحبا! نحن جاهزون للبدء",
  "type": "text"
}
```

### Response:
```json
{
  "success": true,
  "message": "تم إرسال الرسالة بنجاح",
  "data": {
    "_id": "messageId123",
    "content": "مرحبا! نحن جاهزون للبدء",
    "sender": { ... },
    "createdAt": "..."
  }
}
```

### ما يحدث:
1. ✅ Message يتم إنشاؤه
2. ✅ ChatRoom `lastMessage` يتم تحديثه
3. ✅ ProjectRoom `lastActivityAt` يتم تحديثه
4. ✅ **WebSocket** → إرسال Real-time message
5. ✅ **Notifications** → جميع المشاركين (ما عدا المرسل) يحصلون على إشعار ✅

### للتحقق:

#### 1. جلب الرسائل:
```
GET /api/messages/room/{{chatRoomId}}
Headers: Authorization: Bearer {{token}}
```
يجب أن تجد الرسالة الجديدة

#### 2. جلب Notifications (المشارك الآخر):
```
GET /api/notifications
Headers: Authorization: Bearer {{otherParticipantToken}}
```
يجب أن تجد notification من نوع `"message_received"`

---

## 📊 جدول جميع المسارات

| المسار | Method | Role | الوصف |
|--------|--------|------|-------|
| `/api/projects` | POST | Client | إنشاء مشروع |
| `/api/projects/:id/approve` | PATCH | Admin | موافقة على مشروع ✅ Notifies Client |
| `/api/projects/:id/reject` | PATCH | Admin | رفض مشروع ✅ Notifies Client |
| `/api/proposals` | POST | Engineer | تقديم عرض ✅ Creates ChatRooms + Notifies Admins |
| `/api/proposals/:id/status` | PUT | Admin | تحديث حالة العرض ✅ Notifies Engineer/Client |
| `/api/chat-rooms` | GET | All | جلب غرفي |
| `/api/chat-rooms/project-room/:roomId` | GET | All | غرف Project Room |
| `/api/messages` | POST | All | إرسال رسالة ✅ Notifies Participants |
| `/api/notifications` | GET | All | جلب إشعاراتي |
| `/api/notifications/unread/count` | GET | All | عدد غير المقروءة |

---

## ✅ Checklist للاختبار الكامل

### Setup:
- [ ] Login as Client → `clientToken`
- [ ] Login as Admin → `adminToken`
- [ ] Login as Engineer → `engineerToken`

### Project Flow:
- [ ] Create Project (Client)
- [ ] Approve Project (Admin) → Client gets notification ✅
- [ ] Reject Project (Admin) → Client gets notification ✅ (اختياري للاختبار)

### Proposal Flow:
- [ ] Submit Proposal (Engineer)
  - [ ] Check Console: All ✅ messages
  - [ ] Check: `GET /api/chat-rooms` returns ChatRoom
  - [ ] Check: Admin gets notification ✅
- [ ] Accept Proposal (Admin)
  - [ ] Check: Engineer gets notification ✅
  - [ ] Check: Client gets notification ✅
  - [ ] Check: Group ChatRoom created
- [ ] Reject Proposal (Admin)
  - [ ] Check: Engineer gets notification ✅

### Chat Flow:
- [ ] Send Message
  - [ ] Check: Message created
  - [ ] Check: Participants get notifications ✅
  - [ ] Check: WebSocket sends real-time message

### Notifications:
- [ ] Get Notifications ✅
- [ ] Get Unread Count ✅
- [ ] Mark as Read ✅
- [ ] Delete Notification ✅

---

## 🎯 النتيجة النهائية

**جميع الأنظمة مربوطة وتعمل:**
- ✅ ChatRooms يتم إنشاؤها عند Proposal
- ✅ Notifications يتم إنشاؤها في جميع الأماكن المطلوبة
- ✅ System Messages تستخدم System User ID
- ✅ Real-time via WebSocket
- ✅ جميع المسارات تعمل بشكل صحيح

---

**📝 تاريخ التحديث**: ${new Date().toLocaleString('ar-SA')}
