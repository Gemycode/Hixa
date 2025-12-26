# دليل اختبار المرحلة 1 و 2

## 📋 ما تم إنجازه:

### المرحلة 1: Socket.io ✅
- تعديل `app.js` لاستخدام Socket.io
- تعديل `messageController.js` لإرسال الأحداث
- تحديث `socket.js` و `socketService.ts`

### المرحلة 2: Routes ✅
- إضافة Route `/project-rooms/:roomId/chat-rooms`

---

## 🧪 خطوات الاختبار:

### 1. تشغيل الباك إند

```bash
cd Hixa-back
npm start
```

**التحقق من:**
- ✅ السيرفر يعمل على البورت المحدد
- ✅ لا توجد أخطاء في Console
- ✅ يجب أن ترى: `Socket.io initialized` (إذا كان هناك log)

---

### 2. تشغيل الفرونت إند

```bash
cd Hixa-front
npm run dev
```

**التحقق من:**
- ✅ الفرونت يعمل
- ✅ يمكنك تسجيل الدخول
- ✅ لا توجد أخطاء في Console

---

### 3. اختبار Route الجديد (المرحلة 2)

#### 3.1 اختبار من Browser Console:

افتح Browser Console (F12) واكتب:

```javascript
// الحصول على token من localStorage
const token = localStorage.getItem('token');
const projectRoomId = 'YOUR_PROJECT_ROOM_ID'; // استبدل بـ ID حقيقي

// اختبار Route
fetch(`https://hixa.onrender.com/api/project-rooms/${projectRoomId}/chat-rooms`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('✅ Chat Rooms:', data);
})
.catch(err => console.error('❌ Error:', err));
```

**النتيجة المتوقعة:**
- ✅ Status: 200
- ✅ Response يحتوي على `data` array
- ✅ كل ChatRoom يحتوي على `unreadCount`

#### 3.2 اختبار من Postman/Thunder Client:

```
GET https://hixa.onrender.com/api/project-rooms/:roomId/chat-rooms
Headers:
  Authorization: Bearer YOUR_TOKEN
```

**النتيجة المتوقعة:**
```json
{
  "data": [
    {
      "_id": "...",
      "type": "admin-engineer",
      "participants": [...],
      "lastMessage": {...},
      "unreadCount": 0,
      ...
    }
  ]
}
```

---

### 4. اختبار Socket.io (المرحلة 1)

#### 4.1 فتح صفحة Messages:

1. سجل دخول كـ Admin
2. اذهب إلى `/admin/messages` أو صفحة Messages
3. افتح Browser Console

**التحقق من:**
- ✅ يجب أن ترى: `✅ Socket connected: [socket-id]`
- ✅ لا توجد أخطاء Socket.io

#### 4.2 اختبار إرسال رسالة:

1. افتح ChatRoom
2. أرسل رسالة
3. في Console يجب أن ترى:
   - `User [name] joined room: [chatRoomId]`
   - لا توجد أخطاء

#### 4.3 اختبار استقبال رسالة Real-time:

**في نافذتين مختلفتين:**
1. **نافذة 1**: سجل دخول كـ Admin
2. **نافذة 2**: سجل دخول كـ Engineer أو Client
3. افتح نفس ChatRoom في النافذتين
4. أرسل رسالة من نافذة 1
5. **النتيجة المتوقعة**: الرسالة تظهر فوراً في نافذة 2 (real-time)

#### 4.4 اختبار Typing Indicator:

1. افتح ChatRoom في نافذتين
2. ابدأ الكتابة في نافذة 1
3. **النتيجة المتوقعة**: يظهر "typing..." في نافذة 2

---

### 5. اختبار التكامل الكامل

#### 5.1 Flow كامل:

1. **Dashboard** → `GET /api/project-rooms`
   - ✅ يعرض ProjectRooms
   - ✅ لا توجد أخطاء

2. **اختيار ProjectRoom** → `GET /api/project-rooms/:id/chat-rooms`
   - ✅ يعرض ChatRooms
   - ✅ Route يعمل بشكل صحيح

3. **اختيار ChatRoom** → `GET /api/messages/room/:chatRoomId`
   - ✅ يعرض الرسائل
   - ✅ Socket.io يتصل تلقائياً

4. **إرسال رسالة** → `POST /api/messages`
   - ✅ الرسالة تُحفظ
   - ✅ Socket.io يرسل `new_message` event
   - ✅ الرسالة تظهر real-time

---

## ❌ المشاكل المحتملة وحلولها:

### مشكلة 1: Socket.io لا يتصل

**الأعراض:**
- لا توجد رسالة `✅ Socket connected`
- أخطاء في Console

**الحل:**
1. تحقق من أن token موجود في localStorage
2. تحقق من أن `VITE_API_BASE_URL` صحيح
3. تحقق من CORS في Backend
4. تحقق من أن Socket.io يعمل في Backend

### مشكلة 2: Route يعطي 404

**الأعراض:**
- `GET /api/project-rooms/:id/chat-rooms` يعطي 404

**الحل:**
1. تحقق من أن Route موجود في `projectRoomRoutes.js`
2. تحقق من ترتيب Routes (specific قبل parameterized)
3. تحقق من أن `roomId` صحيح

### مشكلة 3: الرسائل لا تظهر Real-time

**الأعراض:**
- الرسالة تُحفظ لكن لا تظهر real-time

**الحل:**
1. تحقق من أن Socket.io متصل
2. تحقق من أن المستخدم انضم للغرفة (`join_room`)
3. تحقق من Console للأخطاء
4. تحقق من أن Backend يرسل `new_message` event

### مشكلة 4: CORS Error

**الأعراض:**
- `CORS policy` error في Console

**الحل:**
1. تحقق من `corsOptions` في `app.js`
2. تحقق من Socket.io CORS في `socket.js`
3. تأكد من أن `origin` مسموح

---

## ✅ Checklist الاختبار:

### Backend:
- [ ] السيرفر يعمل بدون أخطاء
- [ ] Socket.io initialized
- [ ] Route `/project-rooms/:id/chat-rooms` يعمل
- [ ] Route يعيد ChatRooms بشكل صحيح

### Frontend:
- [ ] يمكن تسجيل الدخول
- [ ] Socket.io يتصل عند فتح Messages
- [ ] Dashboard يعرض ProjectRooms
- [ ] ProjectRoomView يعرض ChatRooms
- [ ] ChatRoomView يعرض الرسائل

### Socket.io:
- [ ] Socket connected message يظهر
- [ ] يمكن إرسال رسالة
- [ ] الرسائل تظهر real-time
- [ ] Typing indicator يعمل

### Integration:
- [ ] Flow كامل يعمل من Dashboard إلى ChatRoom
- [ ] إرسال واستقبال رسائل يعمل
- [ ] لا توجد أخطاء في Console

---

## 📝 ملاحظات:

1. **Socket.io يتصل فقط عند الحاجة:**
   - عند فتح صفحة Messages
   - عند استخدام `useChat` hook
   - عند استخدام `useNotificationWebSocket` hook

2. **Route الجديد:**
   - `GET /api/project-rooms/:roomId/chat-rooms`
   - يجب أن يكون قبل `/:roomId` في Routes

3. **Testing في Production:**
   - تأكد من أن Backend يعمل على `https://hixa.onrender.com`
   - تأكد من أن Frontend يتصل بالـ URL الصحيح

---

**تاريخ الإنشاء**: ${new Date().toLocaleString('ar-SA')}
**الحالة**: جاهز للاختبار

