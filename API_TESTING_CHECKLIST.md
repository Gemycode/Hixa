# قائمة التحقق للاختبار - API Testing Checklist

## 📋 Quick Testing Checklist

### 🔐 1. Authentication
- [ ] تسجيل دخول Admin → احصل على `adminToken`
- [ ] تسجيل دخول Engineer → احصل على `engineerToken`
- [ ] تسجيل دخول Client → احصل على `clientToken`

---

### 🔔 2. Notifications System

#### Basic Operations
- [ ] `GET /api/notifications` → يجب أن تكون فارغة في البداية
- [ ] `GET /api/notifications/unread/count` → يجب أن يكون 0
- [ ] `GET /api/notifications/:id` → تحقق من Error 404 (لا يوجد إشعارات)

#### Create Notification (via Message)
- [ ] إنشاء مشروع
- [ ] موافقة على المشروع
- [ ] تقديم عرض → ينشئ ChatRooms
- [ ] إرسال رسالة → ينشئ Notification تلقائياً
- [ ] `GET /api/notifications` → يجب أن يحتوي على إشعار جديد
- [ ] `GET /api/notifications/unread/count` → يجب أن يكون 1

#### Read Operations
- [ ] `GET /api/notifications/:id` → جلب إشعار معين
- [ ] `PATCH /api/notifications/:id/read` → تحديد كمقروء
- [ ] `GET /api/notifications/unread/count` → يجب أن يكون 0
- [ ] `GET /api/notifications?unreadOnly=true` → يجب أن تكون فارغة

#### Bulk Operations
- [ ] `PATCH /api/notifications/read-all` → قراءة الكل
- [ ] `DELETE /api/notifications/:id` → حذف إشعار
- [ ] `DELETE /api/notifications/read/all` → حذف المقروءة

---

### 💬 3. Messages + Notifications Integration

- [ ] `POST /api/messages` → إرسال رسالة
- [ ] التحقق من وجود Notification للمستقبل
- [ ] إرسال رسالة ثانية → يجب أن ينشئ Notification جديد
- [ ] التحقق من Pagination في Notifications

---

### 🤖 4. System Messages

#### في Proposals
- [ ] `POST /api/proposals` → تقديم عرض
- [ ] `GET /api/messages/room/:chatRoomId` → تحقق من System Messages
- [ ] تحقق أن `sender` هو ObjectId (ليس string "system")
- [ ] تحقق أن `type: "system"`

#### في Projects
- [ ] `PUT /api/proposals/:id/status` → قبول عرض
- [ ] `GET /api/chat-rooms?type=group` → تحقق من Group ChatRoom
- [ ] `GET /api/messages/room/:groupChatRoomId` → تحقق من System Message

---

### 🔒 5. Security Tests

- [ ] محاولة الوصول لإشعارات مستخدم آخر → يجب أن يعطي 404/403
- [ ] محاولة حذف إشعار مستخدم آخر → يجب أن يعطي 404/403
- [ ] التحقق من Authorization Headers مطلوبة

---

### 📊 6. Edge Cases

- [ ] إرسال رسالة بدون content (فقط attachments) → يجب أن يعمل
- [ ] جلب Notifications مع Pagination (`page=2&limit=5`)
- [ ] جلب Notifications مع Filter (`unreadOnly=true`)
- [ ] Multiple notifications → تحديد الكل كمقروء

---

## ✅ Expected Results

بعد إكمال جميع الاختبارات:

### ✅ Notifications:
- ✅ Create, Read, Update, Delete تعمل
- ✅ Integration مع Messages يعمل
- ✅ Real-time via WebSocket يعمل

### ✅ System Messages:
- ✅ تستخدم System User ID (ObjectId)
- ✅ يتم إنشاؤها عند Proposals
- ✅ يتم إنشاؤها عند Project Updates

### ✅ Security:
- ✅ Users لا يمكنهم الوصول لإشعارات الآخرين
- ✅ Authorization مطلوبة

---

## 🐛 Common Issues

### Issue 1: Notifications لا تظهر
**الحل:**
- تحقق أن المستخدمين في نفس ChatRoom
- تحقق من Console Logs
- تأكد من `createNotification()` يتم استدعاؤها

### Issue 2: System Messages بـ sender: "system" (string)
**الحل:**
- تأكد من استخدام `getSystemUserId()` في الكود
- تحقق أن System User موجود في DB

### Issue 3: WebSocket Notifications لا تعمل
**الحل:**
- تأكد أن WebSocket Server يعمل
- تحقق من Connection في Client
- Review WebSocket logs

---

## 📝 Notes

1. **Base URL**: `http://localhost:5000/api` أو Production URL
2. **Headers**: جميع Requests تحتاج `Authorization: Bearer <token>`
3. **Content-Type**: `application/json` للـ POST/PUT/PATCH

---

**🎯 هدف الاختبار**: التأكد أن جميع الأنظمة تعمل بشكل صحيح ومتكامل


