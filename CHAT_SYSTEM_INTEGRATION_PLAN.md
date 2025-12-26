# خطة ربط نظام الدردشة - Backend & Frontend Integration Plan

## 📋 تحليل المشاكل الحالية

### ❌ المشاكل المكتشفة:

#### 1. **مشكلة في Routes - عدم تطابق Endpoints**
- **Frontend** يستدعي: `GET /api/project-rooms/:projectRoomId/chat-rooms`
- **Backend** موجود: `GET /api/chat-rooms/project-room/:roomId`
- **الحل**: إضافة route جديد في `projectRoomRoutes.js` أو تعديل Frontend

#### 2. **مشكلة في WebSocket - استخدام تقنيتين مختلفتين**
- **Backend**: يستخدم `WebSocket` (native ws) في `websocket/websocket.js`
- **Frontend**: يستخدم `Socket.io` في `socketService.ts`
- **المشكلة**: لا يمكن التواصل بينهما!
- **الحل**: توحيد استخدام Socket.io في Backend

#### 3. **مشكلة في Socket Events - عدم تطابق الأحداث**
- **Backend** يرسل: `{ type: 'new_message', data: {...} }`
- **Frontend** يستمع: `'new_message'` (Socket.io event)
- **المشكلة**: الباك يستخدم native WebSocket، الفرونت يستخدم Socket.io

#### 4. **مشكلة في API Response Structure**
- **Frontend** يتوقع: `response.data.data` أو `response.data`
- **Backend** يرسل: `{ data: [...] }` أو `{ message: "...", data: {...} }`
- **الحل**: توحيد Response Structure

#### 5. **مشكلة في Unread Count**
- **Backend** يحسب unread count لكن قد لا يرسله في جميع الـ responses
- **Frontend** لا يعرض unread count بشكل صحيح

---

## ✅ الحلول المطلوبة

### المرحلة 1: إصلاح WebSocket (الأولوية القصوى)

#### 1.1 إزالة native WebSocket واستخدام Socket.io فقط
- ✅ Backend يستخدم Socket.io بالفعل في `socket.js`
- ❌ لكن `app.js` يستخدم `websocket/websocket.js` (native)
- ✅ `messageController.js` يستخدم `getWebSocketServer()` من websocket.js

**الإجراءات:**
1. تعديل `app.js` لاستخدام Socket.io بدلاً من native WebSocket
2. تعديل `messageController.js` لاستخدام Socket.io
3. حذف أو تعطيل `websocket/websocket.js` (أو إعادة كتابته لاستخدام Socket.io)

#### 1.2 توحيد Socket Events
**Backend Events (Socket.io):**
- `new_message` - رسالة جديدة
- `message_updated` - تحديث رسالة
- `message_deleted` - حذف رسالة
- `reaction_updated` - تحديث تفاعل
- `user_typing` - مؤشر الكتابة

**Frontend Events (Socket.io):**
- `new_message` ✅
- `message_updated` ✅
- `message_deleted` ✅
- `reaction_updated` ✅
- `user_typing` ✅

**الحالة**: الأحداث متطابقة، المشكلة فقط في التنفيذ!

---

### المرحلة 2: إصلاح Routes

#### 2.1 إضافة Route في projectRoomRoutes
```javascript
// في projectRoomRoutes.js
router.get('/:roomId/chat-rooms', getChatRoomsByProjectRoom);
```

**أو** تعديل Frontend لاستخدام:
```typescript
// في messagesApi.ts
getChatRooms: async (projectRoomId: string) => {
  const response = await http.get(`/chat-rooms/project-room/${projectRoomId}`);
  // ...
}
```

**التوصية**: إضافة Route في projectRoomRoutes (أكثر منطقية)

---

### المرحلة 3: توحيد Response Structure

#### 3.1 Backend Response Format
جميع الـ responses يجب أن تكون:
```json
{
  "success": true,
  "message": "..." (optional),
  "data": {...} or [...]
}
```

#### 3.2 Frontend Parsing
```typescript
// في messagesApi.ts
return response.data?.data || response.data || [];
```

**الحالة**: Frontend جاهز، فقط التأكد من Backend يرسل `data` دائماً

---

### المرحلة 4: إصلاح Unread Count

#### 4.1 Backend
- ✅ `chatHelpers.js` يحتوي على functions لحساب unread count
- ✅ Controllers تستخدم `addUnreadCountToChatRooms`
- ✅ يجب التأكد من إرسال `unreadCount` في جميع responses

#### 4.2 Frontend
- ❌ `Dashboard.tsx` لا يعرض unread count
- ❌ `ProjectRoomView.tsx` لا يعرض unread count
- ✅ `ChatRoom` interface يحتوي على `unreadCount?`

**الإجراءات:**
1. إضافة عرض unread count في Dashboard
2. إضافة عرض unread count في ProjectRoomView
3. إضافة عرض unread count في ChatRoomView

---

### المرحلة 5: إصلاح Socket.io Connection

#### 5.1 Backend Socket.io Setup
- ✅ `socket.js` موجود ويستخدم Socket.io
- ❌ لكن `app.js` لا يستخدمه!
- ✅ يجب استدعاء `initSocket(server)` في `app.js`

#### 5.2 Frontend Socket.io Connection
- ✅ `socketService.ts` يستخدم Socket.io
- ✅ يتصل بـ `window.location.origin` أو `VITE_API_BASE_URL`
- ✅ يرسل token في `auth.token`

**المشكلة**: Backend لا يستخدم Socket.io في `app.js`!

---

## 🔧 خطوات التنفيذ التفصيلية

### Step 1: إصلاح Socket.io في Backend

#### 1.1 تعديل `app.js`
```javascript
// إزالة:
const { initWebSocketServer } = require('@websocket/websocket');
const wss = initWebSocketServer(server);

// إضافة:
const { initSocket } = require('./socket');
const io = initSocket(server);
```

#### 1.2 تعديل `messageController.js`
```javascript
// إزالة:
const { getWebSocketServer } = require('../websocket/websocket');
const wss = getWebSocketServer();
wss.broadcastToRoom(chatRoomId.toString(), {...});

// إضافة:
const { getIO } = require('../socket');
const io = getIO();
io.to(chatRoomId.toString()).emit('new_message', {...});
```

#### 1.3 تحديث Socket Events في messageController
- `new_message` → `io.to(roomId).emit('new_message', { message, chatRoomId })`
- `message_updated` → `io.to(roomId).emit('message_updated', { message, chatRoomId })`
- `message_deleted` → `io.to(roomId).emit('message_deleted', { messageId, chatRoomId })`
- `reaction_updated` → `io.to(roomId).emit('reaction_updated', { message, chatRoomId })`

---

### Step 2: إضافة Route في projectRoomRoutes

#### 2.1 تعديل `projectRoomRoutes.js`
```javascript
const {
  getChatRoomsByProjectRoom, // إضافة هذا
  // ... other functions
} = require("../controllers/chatRoomController");

// إضافة route:
router.get('/:roomId/chat-rooms', getChatRoomsByProjectRoom);
```

---

### Step 3: تحديث Frontend Components

#### 3.1 تحديث `Dashboard.tsx`
- إضافة عرض `unreadCount` لكل ProjectRoom
- إضافة badge للرسائل غير المقروءة

#### 3.2 تحديث `ProjectRoomView.tsx`
- إضافة عرض `unreadCount` لكل ChatRoom
- إضافة badge للرسائل غير المقروءة

#### 3.3 تحديث `ChatRoomView.tsx`
- التأكد من تحديث `lastReadAt` عند فتح الغرفة
- عرض unread count في header

---

### Step 4: اختبار التكامل

#### 4.1 اختبار Socket.io Connection
1. فتح Frontend
2. فتح Browser Console
3. التحقق من: `✅ Socket connected`
4. إرسال رسالة والتحقق من وصولها real-time

#### 4.2 اختبار Routes
1. `GET /api/project-rooms` - جلب ProjectRooms
2. `GET /api/project-rooms/:id/chat-rooms` - جلب ChatRooms
3. `GET /api/messages/room/:chatRoomId` - جلب الرسائل
4. `POST /api/messages` - إرسال رسالة

#### 4.3 اختبار Unread Count
1. إرسال رسالة من مستخدم A
2. فتح الغرفة من مستخدم B
3. التحقق من ظهور unread count
4. فتح الرسالة والتحقق من اختفاء unread count

---

## 📊 Checklist التنفيذ

### Backend:
- [ ] تعديل `app.js` لاستخدام Socket.io
- [ ] تعديل `messageController.js` لاستخدام Socket.io
- [ ] إضافة route `/project-rooms/:roomId/chat-rooms`
- [ ] التأكد من إرسال `unreadCount` في جميع responses
- [ ] اختبار Socket.io events

### Frontend:
- [ ] التأكد من `socketService.ts` يتصل بشكل صحيح
- [ ] إضافة عرض unread count في Dashboard
- [ ] إضافة عرض unread count في ProjectRoomView
- [ ] إضافة عرض unread count في ChatRoomView
- [ ] اختبار real-time messages

### Integration:
- [ ] اختبار إرسال رسالة من Frontend
- [ ] اختبار استقبال رسالة real-time
- [ ] اختبار typing indicators
- [ ] اختبار unread count updates
- [ ] اختبار pagination

---

## 🎯 الأولويات

### Priority 1 (Critical - يجب إصلاحها فوراً):
1. ✅ إصلاح Socket.io في Backend
2. ✅ إضافة route `/project-rooms/:roomId/chat-rooms`
3. ✅ اختبار real-time messages

### Priority 2 (Important):
4. ✅ إضافة unread count في Frontend
5. ✅ تحسين error handling
6. ✅ إضافة loading states

### Priority 3 (Nice to have):
7. ✅ تحسين UI/UX
8. ✅ إضافة animations
9. ✅ تحسين performance

---

## 📝 ملاحظات إضافية

### Socket.io Events Structure:
```javascript
// Backend emits:
io.to(roomId).emit('new_message', {
  message: messageObject,
  chatRoomId: roomId
});

// Frontend listens:
socketService.on('new_message', (data) => {
  // data.message
  // data.chatRoomId
});
```

### API Response Structure:
```javascript
// Success:
{
  success: true,
  data: {...} or [...]
}

// Error:
{
  success: false,
  message: "Error message"
}
```

### Unread Count Calculation:
- يتم حساب unread count بناءً على `lastReadAt` vs `lastMessage.createdAt`
- يتم تحديث `lastReadAt` عند فتح الغرفة أو قراءة رسالة
- يتم إرسال unread count في جميع responses

---

**تاريخ الإنشاء**: ${new Date().toLocaleString('ar-SA')}
**الحالة**: جاهز للتنفيذ

