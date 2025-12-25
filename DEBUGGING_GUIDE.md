# دليل Debugging - Debugging Guide

## 🔍 كيفية التحقق من أن كل شيء يعمل

### 1. عند تقديم Proposal

**الخطوات:**
```
POST /api/proposals
Body: { "projectId": "...", ... }
```

**تحقق من Console Logs:**
```
✅ Created ProjectRoom for project ... (projectRoomId)
✅ Created Admin-Engineer ChatRoom for project ... (chatRoomId)
✅ Created Admin-Client ChatRoom for project ... (chatRoomId)
✅ Created X notification(s) for admins about new proposal
```

**إذا لم ترى هذه الرسائل:**
- ❌ تحقق من Error في Console: `❌ Error creating chat rooms:`
- ❌ تحقق من Project Status: يجب أن يكون `"Waiting for Engineers"`
- ❌ تحقق من `adminApproval.status`: يجب أن يكون `"approved"`

---

### 2. التحقق من ChatRooms

**بعد تقديم Proposal:**
```
GET /api/chat-rooms
Headers: Authorization: Bearer {{engineerToken}}
```

**يجب أن تجد:**
- ✅ ChatRoom من نوع `"admin-engineer"`
- ✅ Project Room linked
- ✅ Participants يحتوي على Engineer

---

### 3. التحقق من Notifications

**للـ Admin:**
```
GET /api/notifications
Headers: Authorization: Bearer {{adminToken}}
```

**يجب أن تجد:**
- ✅ Notification من نوع `"proposal_submitted"`
- ✅ `data.projectId` و `data.proposalId`

**للـ Engineer (بعد الموافقة):**
```
GET /api/notifications
Headers: Authorization: Bearer {{engineerToken}}
```

**يجب أن تجد:**
- ✅ Notification من نوع `"proposal_accepted"` أو `"proposal_rejected"`

---

### 4. عند موافقة/رفض Project

**Console Logs:**
```
✅ Created notification for client about project approval/rejection
```

**للـ Client:**
```
GET /api/notifications
Headers: Authorization: Bearer {{clientToken}}
```

**يجب أن تجد:**
- ✅ Notification من نوع `"project_approved"` أو `"project_rejected"`

---

## 🐛 المشاكل الشائعة وحلولها

### Problem 1: ChatRooms مش بتتكريت

**الأسباب المحتملة:**
1. Project status ليس `"Waiting for Engineers"`
2. `adminApproval.status` ليس `"approved"`
3. Error في الكود (تحقق من Console)

**الحل:**
```javascript
// تحقق من Project Status
GET /api/projects/:projectId

// يجب أن يكون:
{
  "status": "Waiting for Engineers",
  "adminApproval": {
    "status": "approved"
  }
}
```

---

### Problem 2: Notifications مش بتوصل

**الأسباب المحتملة:**
1. `createNotification` throws error
2. User غير موجود
3. WebSocket غير متصل (لـ Real-time)

**الحل:**
- ✅ تحقق من Console Logs: `❌ Error creating notification:`
- ✅ تحقق من User موجود في DB
- ✅ تحقق من WebSocket connection

---

### Problem 3: System Messages مش بتتكريت

**الأسباب المحتملة:**
1. System User غير موجود
2. `getSystemUserId()` throws error

**الحل:**
```javascript
// تحقق من System User موجود
// في DB يجب أن تجد user بـ:
// email: "system@hixa.com"
// role: "admin"
```

---

## 📝 Checklist للـ Debug

### عند تقديم Proposal:
- [ ] Console shows: `✅ Created ProjectRoom`
- [ ] Console shows: `✅ Created Admin-Engineer ChatRoom`
- [ ] Console shows: `✅ Created Admin-Client ChatRoom`
- [ ] Console shows: `✅ Created X notification(s) for admins`
- [ ] `GET /api/chat-rooms` returns ChatRoom
- [ ] `GET /api/notifications` (Admin) returns notification

### عند موافقة على Proposal:
- [ ] Console shows: `✅ Created notification for engineer`
- [ ] Console shows: `✅ Created notification for client`
- [ ] Group ChatRoom يتم إنشاؤه
- [ ] Engineer و Client يحصلون على notifications

### عند إرسال رسالة:
- [ ] Message يتم إنشاؤه
- [ ] Participants (ما عدا المرسل) يحصلون على notifications
- [ ] WebSocket يرسل Real-time message

---

## 🎯 Testing Flow كامل

### Step 1: Setup
```
1. Login as Client → clientToken
2. Login as Admin → adminToken
3. Login as Engineer → engineerToken
```

### Step 2: Create Project
```
POST /api/projects (Client)
→ Save projectId
```

### Step 3: Approve Project
```
PATCH /api/projects/:projectId/approve (Admin)
→ Check: Client gets notification ✅
```

### Step 4: Submit Proposal
```
POST /api/proposals (Engineer)
→ Check Console: All ✅ messages
→ Check: GET /api/chat-rooms returns ChatRoom
→ Check: GET /api/notifications (Admin) returns notification
```

### Step 5: Accept Proposal
```
PUT /api/proposals/:proposalId/status (Admin)
Body: { "status": "accepted" }
→ Check Console: Notifications created
→ Check: Engineer and Client get notifications
→ Check: Group ChatRoom created
```

### Step 6: Send Message
```
POST /api/messages
→ Check: Participants get notifications
→ Check: WebSocket sends real-time message
```

---

**📝 جميع الأنظمة الآن مربوطة وتعمل بشكل صحيح!**
