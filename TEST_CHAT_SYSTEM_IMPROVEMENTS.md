# دليل اختبار تحسينات نظام الشات - Testing Guide for Chat System Improvements

## 📋 نظرة عامة

هذا الدليل يحتوي على خطوات اختبار جميع التحسينات الجديدة لنظام الشات.

---

## 🔐 التحضير

### 1. الحصول على Tokens

```
POST /api/auth/login (Admin)
POST /api/auth/login (Client)
POST /api/auth/login (Engineer)
```

---

## ✅ Test 1: Unread Count System

### 1.1 Get ChatRoom with Unread Count

```
GET /api/chat-rooms/:roomId
Headers: Authorization: Bearer {{token}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "id": "...",
    "unreadCount": 5,
    ...
  }
}
```

---

### 1.2 Get ProjectRoom with Unread Count

```
GET /api/project-rooms/:roomId
Headers: Authorization: Bearer {{token}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "id": "...",
    "unreadCount": 10,
    ...
  }
}
```

---

### 1.3 Get Specific Unread Count (ChatRoom)

```
GET /api/chat-rooms/:roomId/unread-count
Headers: Authorization: Bearer {{token}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "chatRoomId": "...",
    "unreadCount": 5
  }
}
```

---

### 1.4 Get Specific Unread Count (ProjectRoom)

```
GET /api/project-rooms/:roomId/unread-count
Headers: Bearer {{token}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "projectRoomId": "...",
    "unreadCount": 10
  }
}
```

---

### 1.5 Test Unread Count After Reading Messages

```
# Step 1: Send message in chat room
POST /api/messages
Body: { "chatRoomId": "...", "content": "Test" }

# Step 2: Mark as read
PATCH /api/messages/:messageId/read

# Step 3: Check unread count
GET /api/chat-rooms/:roomId/unread-count

✅ Expected: unreadCount should decrease
```

---

## ✅ Test 2: Archive/Close Management

### 2.1 Archive ChatRoom (Admin)

```
PATCH /api/chat-rooms/:roomId/archive
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم أرشفة الغرفة بنجاح",
  "data": {
    "status": "archived",
    ...
  }
}
```

**Verify**: 
```
GET /api/chat-rooms
✅ Archived room should not appear (unless ?status=archived for admin)
```

---

### 2.2 Unarchive ChatRoom (Admin)

```
PATCH /api/chat-rooms/:roomId/unarchive
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم إلغاء أرشفة الغرفة بنجاح",
  "data": {
    "status": "active",
    ...
  }
}
```

---

### 2.3 Delete ChatRoom (Admin)

```
DELETE /api/chat-rooms/:roomId
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم حذف الغرفة بنجاح"
}
```

**Verify**: Room status = "archived" (soft delete)

---

### 2.4 Close ProjectRoom (Admin)

```
PATCH /api/project-rooms/:roomId/close
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم إغلاق غرفة المشروع بنجاح",
  "data": {
    "status": "closed",
    "closedAt": "2024-01-15T10:00:00.000Z",
    ...
  }
}
```

---

### 2.5 Reopen ProjectRoom (Admin)

```
PATCH /api/project-rooms/:roomId/reopen
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم إعادة فتح غرفة المشروع بنجاح",
  "data": {
    "status": "active",
    "closedAt": null,
    ...
  }
}
```

---

### 2.6 Non-Admin Tries Archive

```
PATCH /api/chat-rooms/:roomId/archive
Headers: Authorization: Bearer {{clientToken}}
```

**Expected**: ❌ 403 Forbidden - "الأرشفة متاحة للأدمن فقط"

---

## ✅ Test 3: Participants Management

### 3.1 Add Participant (Admin)

```
POST /api/chat-rooms/:roomId/participants
Headers: Authorization: Bearer {{adminToken}}
Body: {
  "userId": "...",
  "role": "engineer"
}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم إضافة المشارك بنجاح",
  "data": {
    "participants": [
      {
        "user": {...},
        "role": "engineer",
        "joinedAt": "..."
      },
      ...
    ]
  }
}
```

---

### 3.2 Remove Participant (Admin)

```
DELETE /api/chat-rooms/:roomId/participants/:participantId
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "message": "تم إزالة المشارك بنجاح",
  "data": {
    "participants": [...]
  }
}
```

---

### 3.3 Add Duplicate Participant

```
POST /api/chat-rooms/:roomId/participants
Body: {
  "userId": "...", // Already a participant
  "role": "engineer"
}
```

**Expected**: ❌ 400 Bad Request - "المستخدم مشارك بالفعل في هذه الغرفة"

---

### 3.4 Client Tries Add Participant

```
POST /api/chat-rooms/:roomId/participants
Headers: Authorization: Bearer {{clientToken}}
```

**Expected**: ❌ 403 Forbidden - "إضافة المشاركين متاحة للأدمن فقط"

---

### 3.5 Invalid Role

```
POST /api/chat-rooms/:roomId/participants
Body: {
  "userId": "...",
  "role": "invalid"
}
```

**Expected**: ❌ 400 Bad Request - "الدور غير صحيح"

---

## ✅ Test 4: Search & Filtering

### 4.1 Filter by Type

```
GET /api/chat-rooms?type=admin-engineer
Headers: Authorization: Bearer {{token}}
```

**Expected**: ✅ 200 OK - Only admin-engineer rooms

---

### 4.2 Filter by Status (Admin)

```
GET /api/chat-rooms?status=archived
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK - Only archived rooms

---

### 4.3 Search in ChatRooms

```
GET /api/chat-rooms?search=مشروع
Headers: Authorization: Bearer {{token}}
```

**Expected**: ✅ 200 OK - Rooms matching search term

---

### 4.4 Combined Filters

```
GET /api/chat-rooms?type=group&search=test
Headers: Authorization: Bearer {{token}}
```

**Expected**: ✅ 200 OK - Group rooms matching "test"

---

## ✅ Test 5: Statistics

### 5.1 ChatRoom Statistics (Admin)

```
GET /api/chat-rooms/statistics
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "total": 50,
    "active": 45,
    "archived": 5,
    "byType": {
      "adminEngineer": 20,
      "adminClient": 15,
      "group": 10
    }
  }
}
```

---

### 5.2 ProjectRoom Statistics (Admin)

```
GET /api/project-rooms/statistics
Headers: Authorization: Bearer {{adminToken}}
```

**Expected**: ✅ 200 OK
```json
{
  "data": {
    "total": 30,
    "active": 25,
    "closed": 5
  }
}
```

---

### 5.3 Non-Admin Tries Statistics

```
GET /api/chat-rooms/statistics
Headers: Authorization: Bearer {{clientToken}}
```

**Expected**: ❌ 403 Forbidden - "الإحصائيات متاحة للأدمن فقط"

---

## 🔄 Integration Tests

### Scenario 1: Complete Chat Flow

```
1. Engineer submits proposal
   → ProjectRoom created
   → ChatRooms created

2. Get ProjectRooms
   GET /api/project-rooms
   → Check unreadCount = 0 (no messages yet)

3. Admin sends message
   POST /api/messages
   → Message sent

4. Get ChatRoom
   GET /api/chat-rooms/:roomId
   → Check unreadCount = 1 (for engineer)

5. Engineer reads message
   PATCH /api/messages/:messageId/read
   → Mark as read

6. Get ChatRoom again
   GET /api/chat-rooms/:roomId
   → Check unreadCount = 0

7. Admin archives room
   PATCH /api/chat-rooms/:roomId/archive

8. Get ChatRooms
   GET /api/chat-rooms
   → Archived room should not appear

9. Admin unarchives
   PATCH /api/chat-rooms/:roomId/unarchive

10. Get ChatRooms
    GET /api/chat-rooms
    → Room should appear again
```

---

### Scenario 2: Participants Management

```
1. Admin creates chat room
   POST /api/chat-rooms
   → Room created

2. Admin adds participant
   POST /api/chat-rooms/:roomId/participants
   Body: { "userId": "...", "role": "engineer" }
   → Participant added

3. Get ChatRoom
   GET /api/chat-rooms/:roomId
   → Check participant exists

4. Admin removes participant
   DELETE /api/chat-rooms/:roomId/participants/:participantId
   → Participant removed

5. Get ChatRoom
   GET /api/chat-rooms/:roomId
   → Check participant removed
```

---

## 📊 Quick Test Checklist

### Unread Count
- [ ] Get ChatRoom → unreadCount exists
- [ ] Get ProjectRoom → unreadCount exists
- [ ] Get specific unread count endpoints work
- [ ] Unread count decreases after reading messages

### Archive/Close
- [ ] Archive ChatRoom (Admin)
- [ ] Unarchive ChatRoom (Admin)
- [ ] Delete ChatRoom (Admin)
- [ ] Close ProjectRoom (Admin)
- [ ] Reopen ProjectRoom (Admin)
- [ ] Non-admin cannot archive/close

### Participants
- [ ] Add participant (Admin)
- [ ] Remove participant (Admin)
- [ ] Cannot add duplicate
- [ ] Non-admin cannot add/remove

### Search & Filter
- [ ] Filter by type works
- [ ] Filter by status works (Admin)
- [ ] Search works
- [ ] Combined filters work

### Statistics
- [ ] ChatRoom statistics (Admin)
- [ ] ProjectRoom statistics (Admin)
- [ ] Non-admin cannot access statistics

---

**⏱️ Estimated Time**: 20-30 minutes for full testing
