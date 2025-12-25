# مرجع سريع للـ API Endpoints - Quick Reference

## 🔐 Base URL
```
http://localhost:5000/api
```
أو Production URL الخاص بك

---

## 🔔 Notifications Endpoints

### 1. جلب الإشعارات
```
GET /api/notifications
Headers: Authorization: Bearer {{token}}
Query: ?page=1&limit=20&unreadOnly=false
```

### 2. عدد غير المقروءة
```
GET /api/notifications/unread/count
Headers: Authorization: Bearer {{token}}
```

### 3. جلب إشعار معين
```
GET /api/notifications/:id
Headers: Authorization: Bearer {{token}}
```

### 4. تحديد كمقروء
```
PATCH /api/notifications/:id/read
Headers: Authorization: Bearer {{token}}
```

### 5. قراءة الكل
```
PATCH /api/notifications/read-all
Headers: Authorization: Bearer {{token}}
```

### 6. حذف إشعار
```
DELETE /api/notifications/:id
Headers: Authorization: Bearer {{token}}
```

### 7. حذف المقروءة
```
DELETE /api/notifications/read/all
Headers: Authorization: Bearer {{token}}
```

---

## 💬 Messages Endpoints

### إرسال رسالة (ينشئ Notification تلقائياً)
```
POST /api/messages
Headers: 
  Authorization: Bearer {{token}}
  Content-Type: application/json
Body:
{
  "chatRoomId": "...",
  "content": "رسالة اختبار",
  "type": "text"
}
```

### جلب رسائل غرفة
```
GET /api/messages/room/:roomId
Headers: Authorization: Bearer {{token}}
```

---

## 📋 Projects Endpoints

### إنشاء مشروع
```
POST /api/projects
Headers: 
  Authorization: Bearer {{clientToken}}
  Content-Type: application/json
Body:
{
  "title": "مشروع اختبار",
  "description": "...",
  "location": "الرياض",
  "projectType": "Construction",
  "budget": { "amount": 50000, "currency": "SAR" }
}
```

### الموافقة على مشروع
```
PATCH /api/projects/:id/approve
Headers: Authorization: Bearer {{adminToken}}
```

---

## 📝 Proposals Endpoints

### تقديم عرض (ينشئ System Messages)
```
POST /api/proposals
Headers: 
  Authorization: Bearer {{engineerToken}}
  Content-Type: application/json
Body:
{
  "projectId": "...",
  "description": "عرض شامل",
  "estimatedTimeline": "3 أشهر",
  "relevantExperience": "خبرة 5 سنوات",
  "proposedBudget": { "amount": 45000, "currency": "SAR" }
}
```

### قبول عرض (ينشئ Group ChatRoom + System Message)
```
PUT /api/proposals/:id/status
Headers: 
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json
Body:
{
  "status": "accepted"
}
```

---

## 💬 Chat Rooms Endpoints

### جلب غرفي
```
GET /api/chat-rooms
Headers: Authorization: Bearer {{token}}
Query: ?type=group
```

### جلب غرفة معينة
```
GET /api/chat-rooms/:roomId
Headers: Authorization: Bearer {{token}}
```

---

## 🔐 Auth Endpoints

### تسجيل الدخول
```
POST /api/auth/login
Content-Type: application/json
Body:
{
  "email": "user@example.com",
  "password": "password"
}
```

---

## 📊 Response Formats

### Success Response
```json
{
  "data": { ... },
  "message": "تم بنجاح"
}
```

### Error Response
```json
{
  "message": "رسالة الخطأ",
  "error": "تفاصيل إضافية"
}
```

### Pagination Response
```json
{
  "data": [ ... ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

---

## 🎯 Testing Flow (بالترتيب)

1. ✅ Login → احصل على Tokens
2. ✅ Create Project → احصل على `projectId`
3. ✅ Approve Project
4. ✅ Submit Proposal → ينشئ ChatRooms + System Messages
5. ✅ Get Chat Rooms → احصل على `chatRoomId`
6. ✅ Send Message → ينشئ Notification
7. ✅ Get Notifications → تحقق من الإشعار
8. ✅ Mark as Read
9. ✅ Delete Notification

---

## 💡 Tips

- احفظ الـ Tokens في Environment Variables في API Dog
- استخدم `{{variableName}}` للاستخدام في Requests
- تأكد من Headers في كل Request
- تحقق من Status Codes (200, 201, 404, 403, 401)


