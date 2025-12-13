# مسارات API الخدمات والتفاصيل

## Base URL
```
https://hixa.onrender.com/api/content
```
أو محلياً:
```
http://localhost:5000/api/content
```

---

## 📋 جدول المحتويات

### 1. [الخدمات (Services Items)](#الخدمات-services-items)
### 2. [تفاصيل الخدمات (Services Details)](#تفاصيل-الخدمات-services-details)
### 3. [إدارة الخدمات العامة](#إدارة-الخدمات-العامة)

---

## 🛠️ الخدمات (Services Items)

### 1. إضافة خدمة جديدة
```
POST /api/content/services/items
```
**Authentication:** ✅ مطلوب (Admin Only)  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```
**Body:**
```json
{
  "title_en": "Web Development",
  "title_ar": "تطوير المواقع",
  "description_en": "Professional web development services",
  "description_ar": "خدمات تطوير مواقع احترافية",
  "icon": "web-icon"
}
```
**Response:**
```json
{
  "message": "تم إضافة الخدمة بنجاح",
  "data": {
    "_id": "693da0021e74a595fd589edf",
    "title_en": "Web Development",
    "title_ar": "تطوير المواقع",
    ...
  }
}
```

---

### 2. جلب خدمة مع تفاصيلها
```
GET /api/content/services/items/:id
```
**Authentication:** ❌ Public (لا يحتاج token)  
**Example:**
```
GET /api/content/services/items/693da0021e74a595fd589edf
```
**Response:**
```json
{
  "message": "تم جلب الخدمة بنجاح",
  "data": {
    "service": {
      "_id": "693da0021e74a595fd589edf",
      "title_en": "Web Development",
      "title_ar": "تطوير المواقع",
      "description_en": "...",
      "description_ar": "...",
      "icon": "web-icon"
    },
    "details": [
      {
        "_id": "693da13c1e74a595fd58a411",
        "title_en": "Detail 1",
        ...
      }
    ]
  }
}
```

---

### 3. تحديث خدمة
```
PUT /api/content/services/items/:id
```
**Authentication:** ✅ مطلوب (Admin Only)  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```
**Body:**
```json
{
  "title_en": "Updated Service",
  "title_ar": "خدمة محدثة",
  "description_en": "Updated description",
  "icon": "new-icon"
}
```
**Response:**
```json
{
  "message": "تم تحديث الخدمة بنجاح",
  "data": {
    "_id": "693da0021e74a595fd589edf",
    "title_en": "Updated Service",
    ...
  }
}
```

---

### 4. حذف خدمة (مع حذف تفاصيلها المرتبطة)
```
DELETE /api/content/services/items/:id
```
**Authentication:** ✅ مطلوب (Admin Only)  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```
**Response:**
```json
{
  "message": "تم حذف الخدمة بنجاح وتم حذف 3 من التفاصيل المرتبطة",
  "data": [...],
  "deletedDetailsCount": 3
}
```

---

## 📝 تفاصيل الخدمات (Services Details)

### 1. جلب تفصيلة واحدة بالـ ID
```
GET /api/content/services/details/:id
```
**Authentication:** ❌ Public (لا يحتاج token)  
**Example:**
```
GET /api/content/services/details/693da13c1e74a595fd58a411
```
**Response:**
```json
{
  "message": "تم جلب تفاصيل الخدمة بنجاح",
  "data": {
    "detail": {
      "_id": "693da13c1e74a595fd58a411",
      "title_en": "Detail Title",
      "title_ar": "عنوان التفاصيل",
      "details_en": "Details in English",
      "details_ar": "التفاصيل بالعربية",
      "image": "https://...",
      "sectionKey": "section1",
      "categoryKey": "general",
      "serviceItemId": "693da0021e74a595fd589edf"
    },
    "service": {
      "_id": "693da0021e74a595fd589edf",
      "title_en": "Service Title",
      ...
    }
  }
}
```

---

### 2. جلب جميع تفاصيل خدمة معينة
```
GET /api/content/services/items/:serviceId/details
```
**Authentication:** ❌ Public (لا يحتاج token)  
**Example:**
```
GET /api/content/services/items/693da0021e74a595fd589edf/details
```
**Response:**
```json
{
  "message": "تم جلب تفاصيل الخدمة بنجاح",
  "data": [
    {
      "_id": "693da13c1e74a595fd58a411",
      "title_en": "Detail 1",
      "title_ar": "تفصيل 1",
      "details_en": "...",
      "details_ar": "...",
      "image": "https://...",
      "sectionKey": "section1",
      "categoryKey": "general",
      "serviceItemId": "693da0021e74a595fd589edf"
    },
    {
      "_id": "693da13c1e74a595fd58a412",
      "title_en": "Detail 2",
      ...
    }
  ],
  "count": 2
}
```

---

### 3. إضافة تفاصيل لخدمة محددة
```
POST /api/content/services/items/:serviceId/details
```
**Authentication:** ✅ مطلوب (Admin Only)  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data
```
**Body (Form Data):**
```
title_en: "Service Detail"
title_ar: "تفاصيل الخدمة"
details_en: "Detail description in English"
details_ar: "وصف التفاصيل بالعربية"
sectionKey: "section1"
categoryKey: "general"
image: [file] (optional)
```
**أو JSON:**
```json
{
  "title_en": "Service Detail",
  "title_ar": "تفاصيل الخدمة",
  "details_en": "Detail description",
  "details_ar": "وصف التفاصيل",
  "image": "https://example.com/image.jpg",
  "sectionKey": "section1",
  "categoryKey": "general"
}
```
**Response:**
```json
{
  "message": "تم إضافة تفاصيل الخدمة بنجاح",
  "data": {
    "_id": "693da13c1e74a595fd58a411",
    "title_en": "Service Detail",
    "serviceItemId": "693da0021e74a595fd589edf",
    ...
  }
}
```

---

### 4. تحديث تفصيلة محددة
```
PUT /api/content/services/items/:serviceId/details/:id
```
**Authentication:** ✅ مطلوب (Admin Only)  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: multipart/form-data (أو application/json)
```
**Example:**
```
PUT /api/content/services/items/693da0021e74a595fd589edf/details/693da13c1e74a595fd58a411
```
**Body:**
```json
{
  "title_en": "Updated Detail",
  "title_ar": "تفصيل محدث",
  "details_en": "Updated details",
  "sectionKey": "section2"
}
```
**Response:**
```json
{
  "message": "تم تحديث تفاصيل الخدمة بنجاح",
  "data": {
    "_id": "693da13c1e74a595fd58a411",
    "title_en": "Updated Detail",
    ...
  }
}
```

---

### 5. حذف تفصيلة محددة
```
DELETE /api/content/services/items/:serviceId/details/:id
```
**Authentication:** ✅ مطلوب (Admin Only)  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```
**Example:**
```
DELETE /api/content/services/items/693da0021e74a595fd589edf/details/693da13c1e74a595fd58a411
```
**Response:**
```json
{
  "message": "تم حذف تفاصيل الخدمة بنجاح",
  "data": [...]
}
```

---

## 🔧 إدارة الخدمات العامة

### 1. تحديث قسم الخدمات (العناوين والـ items والـ details)
```
PUT /api/content/services
```
**Authentication:** ✅ مطلوب (Admin Only)  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json
```
**Body:**
```json
{
  "title_en": "Our Services",
  "title_ar": "خدماتنا",
  "subtitle_en": "We provide excellent services",
  "subtitle_ar": "نقدم خدمات ممتازة",
  "items": [
    {
      "_id": "693da0021e74a595fd589edf",
      "title_en": "Service 1",
      "title_ar": "خدمة 1",
      ...
    }
  ],
  "details": [
    {
      "_id": "693da13c1e74a595fd58a411",
      "title_en": "Detail 1",
      "serviceItemId": "693da0021e74a595fd589edf",
      ...
    }
  ]
}
```
**ملاحظة:** يمكنك تحديث حقل واحد فقط أو عدة حقول. إذا لم ترسل `items` أو `details`، سيتم الحفاظ على القيم الموجودة.

---

### 2. حذف التفاصيل غير المرتبطة بخدمات
```
DELETE /api/content/services/details/orphaned
```
**Authentication:** ✅ مطلوب (Admin Only)  
**Headers:**
```
Authorization: Bearer YOUR_TOKEN
```
**Description:** يحذف جميع التفاصيل التي `serviceItemId` فيها `null` أو غير موجود  
**Response:**
```json
{
  "message": "تم حذف 5 من التفاصيل غير المرتبطة بخدمات بنجاح",
  "deletedCount": 5,
  "remainingDetails": 10
}
```

---

## 📌 ملاحظات مهمة

### 1. ترتيب الـ Routes
- الـ routes الأكثر تحديداً (مع `/details`) يجب أن تأتي قبل الأقل تحديداً
- مثال: `/services/items/:serviceId/details` قبل `/services/items/:id`

### 2. الـ IDs
- جميع الـ IDs يجب أن تكون MongoDB ObjectId صحيحة
- عند تحديث `items`، يجب إرسال `_id` للـ items الموجودة للحفاظ على التفاصيل المرتبطة

### 3. العلاقة بين Items و Details
- كل تفصيلة مرتبطة بخدمة عبر `serviceItemId`
- عند حذف خدمة، يتم حذف جميع تفاصيلها المرتبطة تلقائياً
- عند تحديث خدمة، يتم الحفاظ على التفاصيل المرتبطة بها

### 4. الصور
- يمكن رفع الصور كملفات (`multipart/form-data`) أو إرسال URLs (`application/json`)
- الصور المحذوفة يتم حذفها من Cloudinary تلقائياً

### 5. Authentication
- الـ routes العامة (GET) لا تحتاج authentication
- جميع الـ routes الأخرى (POST, PUT, DELETE) تحتاج token

---

## 🔐 الحصول على Token

```
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "YourPassword"
}
```

**Response:**
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {...}
}
```

---

## 📝 أمثلة استخدام

### JavaScript (Fetch)
```javascript
// جلب جميع تفاصيل خدمة
const serviceId = "693da0021e74a595fd589edf";
const response = await fetch(
  `https://hixa.onrender.com/api/content/services/items/${serviceId}/details`
);
const data = await response.json();
console.log(data.data); // Array of details

// إضافة تفصيلة جديدة
const token = "YOUR_TOKEN";
const formData = new FormData();
formData.append("title_en", "New Detail");
formData.append("title_ar", "تفصيل جديد");
formData.append("details_en", "Description");
formData.append("serviceItemId", serviceId);

const addResponse = await fetch(
  `https://hixa.onrender.com/api/content/services/items/${serviceId}/details`,
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`
    },
    body: formData
  }
);
```

### cURL
```bash
# جلب خدمة مع تفاصيلها
curl https://hixa.onrender.com/api/content/services/items/693da0021e74a595fd589edf

# إضافة تفصيلة
curl -X POST \
  https://hixa.onrender.com/api/content/services/items/693da0021e74a595fd589edf/details \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title_en": "New Detail",
    "title_ar": "تفصيل جديد",
    "details_en": "Description"
  }'
```

---

## ✅ Checklist للاستخدام

- [ ] الحصول على token من `/api/auth/login`
- [ ] استخدام الـ IDs الصحيحة (MongoDB ObjectId)
- [ ] إرسال `serviceId` في الـ URL عند التعامل مع التفاصيل
- [ ] إرسال `_id` عند تحديث items موجودة
- [ ] استخدام `multipart/form-data` عند رفع صور
- [ ] التحقق من أن الخدمة موجودة قبل إضافة تفاصيل لها


