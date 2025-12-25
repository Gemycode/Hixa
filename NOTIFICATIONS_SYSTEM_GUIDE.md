# دليل نظام الإشعارات - Notifications System Guide

## 📋 نظرة عامة

تم إنشاء نظام إشعارات كامل يتكامل مع نظام الدردشة والمشاريع والعروض.

---

## 🎯 الميزات

### ✅ ما تم إنجازه:
1. ✅ Notification Model كامل مع جميع الحقول المطلوبة
2. ✅ Controller مع جميع العمليات (CRUD + Read/Unread)
3. ✅ Routes كاملة
4. ✅ Integration مع WebSocket للـ Real-time
5. ✅ Integration مع نظام الرسائل (إشعار عند رسالة جديدة)
6. ✅ إصلاح sender: "system" في الرسائل النظامية

---

## 📡 API Endpoints

### Base URL: `/api/notifications`

#### 1. جلب الإشعارات
```
GET /api/notifications
```

**Query Parameters:**
- `page` (optional, default: 1) - رقم الصفحة
- `limit` (optional, default: 20) - عدد الإشعارات في الصفحة
- `unreadOnly` (optional, default: false) - جلب غير المقروءة فقط

**Response:**
```json
{
  "data": [
    {
      "_id": "...",
      "user": "...",
      "type": "message_received",
      "title": "رسالة جديدة",
      "message": "أحمد: مرحبا",
      "data": {
        "chatRoomId": "...",
        "messageId": "..."
      },
      "isRead": false,
      "readAt": null,
      "actionUrl": "/chat/...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "meta": {
    "total": 10,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

---

#### 2. جلب عدد غير المقروءة
```
GET /api/notifications/unread/count
```

**Response:**
```json
{
  "data": {
    "unreadCount": 5
  }
}
```

---

#### 3. جلب إشعار معين
```
GET /api/notifications/:id
```

**Response:**
```json
{
  "data": {
    "_id": "...",
    "user": "...",
    "type": "message_received",
    "title": "رسالة جديدة",
    "message": "...",
    "isRead": false,
    "createdAt": "..."
  }
}
```

---

#### 4. تحديد إشعار كمقروء
```
PATCH /api/notifications/:id/read
```

**Response:**
```json
{
  "message": "تم تحديد الإشعار كمقروء",
  "data": {
    "_id": "...",
    "isRead": true,
    "readAt": "..."
  }
}
```

---

#### 5. تحديد جميع الإشعارات كمقروءة
```
PATCH /api/notifications/read-all
```

**Response:**
```json
{
  "message": "تم تحديد جميع الإشعارات كمقروءة",
  "data": {
    "updatedCount": 5
  }
}
```

---

#### 6. حذف إشعار
```
DELETE /api/notifications/:id
```

**Response:**
```json
{
  "message": "تم حذف الإشعار بنجاح"
}
```

---

#### 7. حذف جميع الإشعارات المقروءة
```
DELETE /api/notifications/read/all
```

**Response:**
```json
{
  "message": "تم حذف جميع الإشعارات المقروءة",
  "data": {
    "deletedCount": 10
  }
}
```

---

## 🔔 أنواع الإشعارات

### 1. `message_received`
- **متى**: عند استلام رسالة جديدة في الشات
- **Data**: `chatRoomId`, `messageId`

### 2. `project_approved`
- **متى**: عند موافقة الأدمن على مشروع
- **Data**: `projectId`

### 3. `project_rejected`
- **متى**: عند رفض الأدمن لمشروع
- **Data**: `projectId`

### 4. `proposal_submitted`
- **متى**: عند تقديم عرض على مشروع
- **Data**: `projectId`, `proposalId`

### 5. `proposal_accepted`
- **متى**: عند قبول عرض
- **Data**: `projectId`, `proposalId`

### 6. `proposal_rejected`
- **متى**: عند رفض عرض
- **Data**: `projectId`, `proposalId`

### 7. `project_status_changed`
- **متى**: عند تغيير حالة المشروع
- **Data**: `projectId`

### 8. `project_completed`
- **متى**: عند إكمال المشروع
- **Data**: `projectId`

### 9. `review_received`
- **متى**: عند استلام مراجعة جديدة
- **Data**: `reviewId`

### 10. `system_announcement`
- **متى**: إعلانات النظام
- **Data**: (حسب الحاجة)

---

## 🔧 الاستخدام في الكود

### إنشاء إشعار يدوي:
```javascript
const { createNotification } = require('./controllers/notificationController');

await createNotification({
  user: userId,
  type: 'message_received',
  title: 'رسالة جديدة',
  message: 'أحمد: مرحبا',
  data: {
    chatRoomId: chatRoom._id,
    messageId: message._id,
  },
  actionUrl: `/chat/${chatRoom._id}`,
});
```

---

## 🌐 Real-time Notifications (WebSocket)

عند إنشاء إشعار جديد، يتم إرساله تلقائياً عبر WebSocket للمستخدم المعني:

```javascript
// في notificationController.js
const wss = getWebSocketServer();
wss.sendToUser(notification.user, {
  type: 'new_notification',
  data: notification,
});
```

**Client-side handling:**
```javascript
ws.on('message', (message) => {
  const data = JSON.parse(message);
  
  if (data.type === 'new_notification') {
    // عرض الإشعار الجديد في UI
    showNotification(data.data);
  }
});
```

---

## ✅ التكامل مع الأنظمة الأخرى

### 1. نظام الرسائل (Messages)
- ✅ يتم إنشاء إشعار تلقائياً عند إرسال رسالة جديدة
- ✅ جميع المشاركين في الغرفة (ما عدا المرسل) يحصلون على إشعار

### 2. نظام المشاريع (Projects)
- ⚠️ يمكن إضافة إشعارات عند:
  - موافقة/رفض المشروع
  - تغيير حالة المشروع
  - إكمال المشروع

### 3. نظام العروض (Proposals)
- ⚠️ يمكن إضافة إشعارات عند:
  - تقديم عرض جديد
  - قبول/رفض عرض

---

## 🔐 الأمان

- ✅ جميع Routes محمية بـ `protect` middleware
- ✅ المستخدم يمكنه فقط الوصول لإشعاراته الخاصة
- ✅ Validation للبيانات المدخلة

---

## 📊 Indexes

تم إضافة Indexes للبحث السريع:
- `{ user: 1, isRead: 1, createdAt: -1 }` - لجلب الإشعارات
- `{ user: 1, createdAt: -1 }` - للترتيب حسب التاريخ
- `{ type: 1, createdAt: -1 }` - للبحث حسب النوع

---

## 🎯 الخطوات التالية (Optional)

1. ⚠️ إضافة إشعارات عند موافقة/رفض المشاريع
2. ⚠️ إضافة إشعارات عند قبول/رفض العروض
3. ⚠️ Email Notifications (اختياري)
4. ⚠️ Push Notifications (اختياري)
5. ⚠️ Notification Preferences (تفضيلات الإشعارات)

---

**📝 تم إنشاء النظام**: ${new Date().toLocaleString('ar-SA')}


