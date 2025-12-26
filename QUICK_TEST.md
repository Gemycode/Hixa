# اختبار سريع - المرحلة 1 و 2

## ⚡ اختبار سريع (5 دقائق):

### 1. اختبار Route (30 ثانية):

افتح Browser Console واكتب:

```javascript
// احصل على token
const token = localStorage.getItem('token');
console.log('Token:', token ? '✅ موجود' : '❌ غير موجود');

// احصل على ProjectRoom ID (من Dashboard)
// ثم اختبر Route:
fetch('https://hixa.onrender.com/api/project-rooms/YOUR_PROJECT_ROOM_ID/chat-rooms', {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(d => console.log('✅ Chat Rooms:', d))
.catch(e => console.error('❌ Error:', e));
```

**النتيجة المتوقعة:**
- ✅ Status: 200
- ✅ Response يحتوي على `data` array

---

### 2. اختبار Socket.io (1 دقيقة):

1. اذهب إلى صفحة Messages (`/admin/messages`)
2. افتح Browser Console
3. **ابحث عن:**
   - `✅ Socket connected: [socket-id]`

**إذا لم تراها:**
- تحقق من أنك في صفحة Messages
- تحقق من أن token موجود

---

### 3. اختبار إرسال رسالة (2 دقيقة):

1. افتح ChatRoom
2. أرسل رسالة
3. **التحقق:**
   - ✅ الرسالة تُحفظ
   - ✅ لا توجد أخطاء في Console
   - ✅ Socket.io يعمل

---

### 4. اختبار Real-time (2 دقيقة):

**في نافذتين:**
1. نافذة 1: Admin
2. نافذة 2: Engineer/Client
3. افتح نفس ChatRoom
4. أرسل رسالة من نافذة 1
5. **النتيجة:** تظهر في نافذة 2 فوراً ✅

---

## ✅ إذا كل شيء يعمل:

- ✅ Route يعمل
- ✅ Socket.io متصل
- ✅ الرسائل تُرسل
- ✅ Real-time يعمل

**→ جاهز للمرحلة 3!**

---

## ❌ إذا كان هناك مشاكل:

راجع `TESTING_GUIDE_PHASE_1_2.md` للحلول التفصيلية.

