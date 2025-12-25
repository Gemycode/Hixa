# خطة اختبار نظام الشات - Chat System Testing Plan

## 🧪 الاختبارات المطلوبة

### 1. نظام الإشعارات (Notifications)
### 2. نظام الرسائل مع Integration
### 3. System User
### 4. WebSocket Notifications

---

## 📋 الاختبارات التفصيلية

### ✅ Test 1: إنشاء System User
**Endpoint**: N/A (Auto-created)
**Expected**: System User يتم إنشاؤه تلقائياً عند أول استخدام

---

### ✅ Test 2: إنشاء إشعار
**Endpoint**: `POST /api/notifications` (Internal - عبر createNotification)
**Expected**: إشعار يتم إنشاؤه ويتم إرساله عبر WebSocket

---

### ✅ Test 3: جلب الإشعارات
**Endpoint**: `GET /api/notifications`
**Headers**: `Authorization: Bearer <token>`
**Expected**: قائمة الإشعارات للمستخدم المسجل

---

### ✅ Test 4: جلب عدد غير المقروءة
**Endpoint**: `GET /api/notifications/unread/count`
**Headers**: `Authorization: Bearer <token>`
**Expected**: عدد الإشعارات غير المقروءة

---

### ✅ Test 5: تحديد إشعار كمقروء
**Endpoint**: `PATCH /api/notifications/:id/read`
**Headers**: `Authorization: Bearer <token>`
**Expected**: `isRead: true`, `readAt: <timestamp>`

---

### ✅ Test 6: إرسال رسالة جديدة (مع Notification)
**Endpoint**: `POST /api/messages`
**Body**: 
```json
{
  "chatRoomId": "...",
  "content": "رسالة اختبار",
  "type": "text"
}
```
**Expected**: 
- الرسالة يتم إنشاؤها
- إشعارات يتم إنشاؤها لجميع المشاركين (ما عدا المرسل)
- WebSocket notification يتم إرسالها

---

### ✅ Test 7: System Messages في Proposals
**Scenario**: 
1. Engineer يقدم Proposal
2. يتم إنشاء System Messages في ChatRooms
**Expected**: System Messages يتم إنشاؤها بـ System User ID (ليس string)

---

### ✅ Test 8: System Messages في Projects
**Scenario**: 
1. Admin يوظف Engineer
2. يتم إنشاء System Messages في Group ChatRoom
**Expected**: System Messages يتم إنشاؤها بـ System User ID

---

## 🔧 خطوات الاختبار

### الخطوة 1: إعداد البيئة
1. التأكد من تشغيل الخادم
2. التأكد من الاتصال بقاعدة البيانات
3. الحصول على Tokens للاختبار

### الخطوة 2: اختبار System User
### الخطوة 3: اختبار Notifications
### الخطوة 4: اختبار Messages + Notifications
### الخطوة 5: اختبار System Messages


