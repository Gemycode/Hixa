# مسار تفاصيل المشروع - Project Details Endpoint

## 📡 Endpoint

```
GET /api/projects/:id
```

**Headers:**
```
Authorization: Bearer <token>
```

---

## 📋 Response Structure

### Response (200 OK)

```json
{
  "data": {
    // Project Basic Info
    "id": "507f1f77bcf86cd799439011",
    "title": "بناء فيلا",
    "description": "...",
    "country": "السعودية",
    "city": "الرياض",
    "location": "الرياض, السعودية",
    "category": "سكني",
    "requirements": "...",
    "projectType": "Construction",
    "status": "Waiting for Engineers",
    "budget": {
      "amount": 100000,
      "currency": "SAR"
    },
    "deadline": "2024-12-31T00:00:00.000Z",
    "tags": ["مشروع كبير", "عاجل"],
    "attachments": [
      {
        "name": "plan.pdf",
        "url": "https://...",
        "type": "document",
        "uploadedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "proposalsCount": 5,
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z",
    
    // Client Info
    "client": {
      "_id": "...",
      "name": "أحمد محمد",
      "email": "ahmed@example.com",
      "avatar": {
        "url": "https://..."
      }
    },
    
    // Assigned Engineer Info
    "assignedEngineer": {
      "_id": "...",
      "name": "محمد علي",
      "email": "mohammed@example.com",
      "avatar": {
        "url": "https://..."
      }
    },
    
    // Admin Approval Info
    "adminApproval": {
      "status": "approved",
      "reviewedBy": {
        "_id": "...",
        "name": "Admin",
        "email": "admin@example.com"
      },
      "reviewedAt": "2024-01-05T00:00:00.000Z",
      "rejectionReason": null
    },
    
    // Additional Details (NEW)
    "proposals": {
      "total": 5,
      "pending": 3,
      "accepted": 1,
      "rejected": 1,
      "myProposal": null  // For engineers: their proposal if exists
    },
    
    "projectRoom": {
      "id": "...",
      "lastActivityAt": "2024-01-15T14:30:00.000Z"
    },
    
    "chatRoomsCount": 3
  }
}
```

---

## 🔐 Permissions

### Client
- ✅ يمكنه رؤية مشاريعه فقط
- ✅ يرى جميع Proposals (counts)
- ✅ يرى ProjectRoom info
- ✅ يرى ChatRooms count

### Engineer
- ✅ يرى المشاريع المعيّن عليها
- ✅ يرى المشاريع المتاحة (Waiting for Engineers, Pending Review)
- ✅ يرى فقط عرضه الخاص (myProposal)
- ✅ يرى Proposals count (عرضه فقط)
- ✅ يرى ProjectRoom info (إذا كان لديه proposal)
- ✅ يرى ChatRooms count (الغرف المشارك فيها فقط)

### Admin
- ✅ يرى جميع المشاريع
- ✅ يرى جميع Proposals (counts)
- ✅ يرى ProjectRoom info
- ✅ يرى جميع ChatRooms count

---

## 📊 Proposals Info (Based on Role)

### For Engineers:
```json
{
  "proposals": {
    "total": 1,
    "pending": 1,
    "accepted": 0,
    "rejected": 0,
    "myProposal": {
      "id": "...",
      "description": "...",
      "estimatedTimeline": "3 أشهر",
      "proposedBudget": {
        "amount": 90000,
        "currency": "SAR"
      },
      "status": "pending",
      "createdAt": "2024-01-10T00:00:00.000Z"
    }
  }
}
```

### For Admin/Client:
```json
{
  "proposals": {
    "total": 5,
    "pending": 3,
    "accepted": 1,
    "rejected": 1,
    "myProposal": null
  }
}
```

---

## 🔍 Query Parameters (Optional)

لا يوجد query parameters حالياً، لكن يمكن إضافتها في المستقبل:
- `?include=proposals` - Include full proposals list
- `?include=chatRooms` - Include chat rooms details
- `?include=history` - Include project history

---

## ❌ Error Responses

### 404 - Project Not Found
```json
{
  "message": "المشروع غير موجود"
}
```

### 403 - Forbidden
```json
{
  "message": "غير مصرح لك بالوصول لهذا المشروع"
}
```

---

## ✅ Features

- ✅ Full project details
- ✅ Client info (with avatar)
- ✅ Assigned engineer info (with avatar)
- ✅ Admin approval details
- ✅ Proposals statistics (role-based)
- ✅ ProjectRoom info
- ✅ ChatRooms count
- ✅ Permissions validation
- ✅ Error handling

---

## 📝 Notes

1. **Proposals Info**: 
   - Engineers see only their proposal
   - Admin/Client see all proposals counts
   - `myProposal` is only for engineers

2. **ProjectRoom**: 
   - May be null if no proposals submitted yet
   - Created automatically when first proposal is submitted

3. **ChatRooms Count**:
   - Counts only rooms user has access to
   - Admin sees all rooms
   - Engineers/Clients see only their rooms

4. **Avatar**: 
   - Now included in client and engineer info
   - Can be null if not set

---

**📅 آخر تحديث**: ${new Date().toLocaleString('ar-SA')}
