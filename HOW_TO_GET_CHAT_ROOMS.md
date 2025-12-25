# كيف تجيب Chat Rooms بعد تقديم Proposal

## 🎯 الطرق المتاحة

بعد تقديم Proposal، يتم إنشاء ChatRooms تلقائياً. يمكنك جلبها بعدة طرق:

---

## ✅ الطريقة 1: جلب جميع غرفي (الأسهل)

**Endpoint:**
```
GET /api/chat-rooms
```

**Headers:**
```
Authorization: Bearer {{engineerToken}}
```

**Response:**
```json
{
  "data": [
    {
      "_id": "...",
      "project": {
        "_id": "...",
        "title": "مشروع البناء",
        "status": "Waiting for Engineers"
      },
      "projectRoom": {
        "_id": "...",
        "projectTitle": "مشروع البناء"
      },
      "type": "admin-engineer",
      "engineer": "...",
      "participants": [
        {
          "user": {
            "_id": "...",
            "name": "المهندس",
            "email": "...",
            "role": "engineer"
          },
          "role": "engineer",
          "joinedAt": "..."
        }
      ],
      "lastMessage": {
        "content": "قام المهندس...",
        "sender": "...",
        "createdAt": "..."
      },
      "createdAt": "..."
    }
  ]
}
```

✅ **هذه هي الطريقة الأسهل والأفضل**

---

## ✅ الطريقة 2: جلب غرف Project Room معين

**Endpoint:**
```
GET /api/chat-rooms/project-room/:roomId
```

**مطلوب:**
1. أولاً: احصل على ProjectRoom ID
   ```
   GET /api/project-rooms/project/:projectId
   ```
2. ثم: استخدم الـ ProjectRoom ID
   ```
   GET /api/chat-rooms/project-room/:projectRoomId
   ```

**Headers:**
```
Authorization: Bearer {{engineerToken}}
```

---

## ✅ الطريقة 3: جلب Project Rooms أولاً

**Step 1: جلب Project Rooms الخاصة بي**
```
GET /api/project-rooms
Headers: Authorization: Bearer {{engineerToken}}
```

**Response:**
```json
{
  "data": [
    {
      "_id": "projectRoomId",
      "project": {
        "_id": "projectId",
        "title": "مشروع البناء",
        "status": "Waiting for Engineers"
      },
      "lastActivityAt": "..."
    }
  ]
}
```

**Step 2: جلب Chat Rooms للـ Project Room**
```
GET /api/chat-rooms/project-room/{{projectRoomId}}
Headers: Authorization: Bearer {{engineerToken}}
```

---

## 🔄 Flow كامل (مثال)

### 1. تقديم Proposal
```
POST /api/proposals
Body: {
  "projectId": "...",
  "description": "...",
  ...
}
```

**يتم تلقائياً:**
- ✅ إنشاء ProjectRoom
- ✅ إنشاء ChatRoom (admin-engineer)
- ✅ إنشاء ChatRoom (admin-client)
- ✅ إرسال System Messages

### 2. جلب Chat Rooms الخاصة بي
```
GET /api/chat-rooms
Headers: Authorization: Bearer {{engineerToken}}
```

**ستحصل على:**
- ✅ جميع Chat Rooms التي أنا participant فيها
- ✅ جميع Chat Rooms التي أنا engineer فيها (حتى لو لم أكن في participants بعد)

---

## 📝 ملاحظات مهمة

### للمهندسين:
- ✅ `GET /api/chat-rooms` → يعيد جميع غرفك (الأسهل)
- ✅ يمكنك أيضاً استخدام `GET /api/project-rooms` أولاً ثم `GET /api/chat-rooms/project-room/:roomId`

### للعملاء:
- ✅ `GET /api/chat-rooms` → يعيد جميع غرفك
- ✅ `GET /api/chat-rooms/project-room/:roomId` → غرف Project Room معين

### للأدمن:
- ✅ `GET /api/chat-rooms` → جميع الغرف
- ✅ `GET /api/chat-rooms/project-room/:roomId` → جميع غرف Project Room

---

## 🎯 الطريقة الموصى بها

**للمهندسين بعد تقديم Proposal:**
```
GET /api/chat-rooms
```
هذه هي الأسهل والأسرع! ✅

---

## 🔍 إذا لم تجد غرف

### تحقق من:
1. ✅ Proposal تم إنشاؤه بنجاح
2. ✅ تحقق من Console Logs في Backend:
   - `Created ProjectRoom for project ...`
   - `Created Admin-Engineer ChatRoom for project ...`
3. ✅ تأكد أنك تستخدم Token صحيح
4. ✅ تحقق من أن ChatRoom يحتوي على `participants` مع userId الخاص بك

### Debug:
```
GET /api/project-rooms
```
- إذا لم تجد ProjectRoom → Proposal لم يتم إنشاء ChatRooms بنجاح
- إذا وجدت ProjectRoom → استخدم `GET /api/chat-rooms/project-room/:roomId`

---

**📝 تم إصلاح المشكلة**: الآن `getChatRoomsByProjectRoom` يعمل للمهندسين أيضاً ✅
