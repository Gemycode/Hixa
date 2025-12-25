# دليل الاختبار على API Dog - API Dog Testing Guide

## 🚀 خطوات سريعة

### 1. إنشاء Environment في API Dog

```
Variables:
- baseUrl: https://your-api-url.com/api
- adminToken: [احفظه بعد Login]
- clientToken: [احفظه بعد Login]
- engineerToken: [احفظه بعد Login]
- projectId: [احفظه بعد إنشاء مشروع]
```

---

## 📋 Collection Structure

### 1. Authentication
```
POST {{baseUrl}}/auth/login (Admin)
POST {{baseUrl}}/auth/login (Client)
POST {{baseUrl}}/auth/login (Engineer)
```

### 2. Projects - Create & Read
```
POST {{baseUrl}}/projects
GET {{baseUrl}}/projects
GET {{baseUrl}}/projects/:id
```

### 3. Projects - Update (New Features)
```
PUT {{baseUrl}}/projects/:id
  Body: { "status": "Waiting for Engineers" }
  Body: { "progress": 50 }
  Body: { "startDate": "2024-01-01" }
```

### 4. Projects - Delete
```
DELETE {{baseUrl}}/projects/:id (Soft Delete)
DELETE {{baseUrl}}/projects/:id/hard (Hard Delete - Admin)
```

### 5. Projects - Duplicate
```
POST {{baseUrl}}/projects/:id/duplicate
```

### 6. Projects - Notes
```
POST {{baseUrl}}/projects/:id/notes
GET {{baseUrl}}/projects/:id/notes
DELETE {{baseUrl}}/projects/:id/notes/:noteId
```

---

## 🔄 Testing Flow

### Step 1: Login

```
POST {{baseUrl}}/auth/login
Headers: Content-Type: application/json
Body:
{
  "email": "admin@example.com",
  "password": "password"
}

Response:
{
  "token": "...",
  "user": {...}
}

→ Copy token → Set in Environment as adminToken
```

---

### Step 2: Create Project (as Client)

```
POST {{baseUrl}}/projects
Headers: 
  Authorization: Bearer {{clientToken}}
  Content-Type: application/json

Body:
{
  "title": "مشروع اختبار",
  "description": "وصف المشروع",
  "country": "السعودية",
  "city": "الرياض",
  "projectType": "Construction",
  "startDate": "2024-01-01",
  "deadline": "2024-12-31"
}

Response:
{
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "startDate": "2024-01-01T00:00:00.000Z",
    "progress": 0,
    "status": "Pending Review",
    "statusHistory": [...]
  }
}

→ Copy id → Set in Environment as projectId
```

---

### Step 3: Test Status Transition

```
PUT {{baseUrl}}/projects/{{projectId}}
Headers:
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json

Body:
{
  "status": "Waiting for Engineers"
}

✅ Expected: 200 OK
```

---

### Step 4: Test Progress Update

```
PUT {{baseUrl}}/projects/{{projectId}}
Headers:
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json

Body:
{
  "progress": 50
}

✅ Expected: 200 OK
{
  "data": {
    "progress": 50
  }
}
```

---

### Step 5: Test Status History

```
GET {{baseUrl}}/projects/{{projectId}}
Headers:
  Authorization: Bearer {{adminToken}}

✅ Expected: 200 OK
{
  "data": {
    "statusHistory": [
      {
        "status": "Pending Review",
        "changedAt": "..."
      },
      {
        "status": "Waiting for Engineers",
        "changedAt": "...",
        "reason": "Admin approval"
      }
    ]
  }
}
```

---

### Step 6: Add Note

```
POST {{baseUrl}}/projects/{{projectId}}/notes
Headers:
  Authorization: Bearer {{adminToken}}
  Content-Type: application/json

Body:
{
  "note": "ملاحظة تجريبية",
  "isInternal": true
}

✅ Expected: 201 Created
{
  "data": {
    "note": "ملاحظة تجريبية",
    "isInternal": true,
    "createdBy": {...}
  }
}
```

---

### Step 7: Get Notes

```
GET {{baseUrl}}/projects/{{projectId}}/notes
Headers:
  Authorization: Bearer {{adminToken}}

✅ Expected: 200 OK
{
  "data": [
    {
      "note": "ملاحظة تجريبية",
      "isInternal": true,
      ...
    }
  ]
}
```

---

### Step 8: Duplicate Project

```
POST {{baseUrl}}/projects/{{projectId}}/duplicate
Headers:
  Authorization: Bearer {{clientToken}}

✅ Expected: 201 Created
{
  "data": {
    "title": "نسخة من مشروع اختبار",
    "status": "Draft",
    "progress": 0
  }
}
```

---

### Step 9: Hard Delete (Admin)

```
DELETE {{baseUrl}}/projects/{{projectId}}/hard
Headers:
  Authorization: Bearer {{adminToken}}

✅ Expected: 200 OK
{
  "message": "تم حذف المشروع نهائياً"
}
```

---

## ⚠️ Error Testing

### Test Invalid Status Transition

```
PUT {{baseUrl}}/projects/{{projectId}}
Body:
{
  "status": "Completed"  // مباشرة من "Pending Review"
}

❌ Expected: 400 Bad Request
{
  "message": "لا يمكن تغيير الحالة من \"Pending Review\" إلى \"Completed\"..."
}
```

---

### Test Invalid Progress

```
PUT {{baseUrl}}/projects/{{projectId}}
Body:
{
  "progress": 150  // أكثر من 100
}

❌ Expected: 400 Bad Request
```

---

### Test Client Trying Hard Delete

```
DELETE {{baseUrl}}/projects/{{projectId}}/hard
Headers:
  Authorization: Bearer {{clientToken}}

❌ Expected: 403 Forbidden
{
  "message": "الحذف النهائي متاح للأدمن فقط"
}
```

---

## 📊 Response Examples

### Get Project with All New Features

```
GET {{baseUrl}}/projects/{{projectId}}
Response:
{
  "data": {
    "id": "...",
    "title": "...",
    "startDate": "2024-01-01T00:00:00.000Z",
    "deadline": "2024-12-31T00:00:00.000Z",
    "progress": 50,
    "status": "In Progress",
    "statusHistory": [
      {
        "status": "Pending Review",
        "changedBy": {...},
        "changedAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "status": "Waiting for Engineers",
        "changedBy": {...},
        "changedAt": "2024-01-05T00:00:00.000Z",
        "reason": "Admin approval"
      },
      {
        "status": "In Progress",
        "changedBy": {...},
        "changedAt": "2024-01-10T00:00:00.000Z"
      }
    ],
    "proposals": {...},
    "projectRoom": {...},
    "chatRoomsCount": 2
  }
}
```

---

## 🎯 Quick Test Script

1. ✅ Login → Get Token
2. ✅ Create Project (with startDate)
3. ✅ Get Project → Check statusHistory
4. ✅ Update Status → Check validation
5. ✅ Update Progress
6. ✅ Add Note (internal)
7. ✅ Get Notes (as Admin → see all, as Client → see public only)
8. ✅ Duplicate Project
9. ✅ Hard Delete (Admin only)

---

**💡 Tip**: احفظ Responses في Environment variables لاستخدامها في الطلبات التالية!
