# دليل أولوية الموقع في المشاريع - Location Priority Guide

## 🎯 الميزة

المشاريع تظهر للمهندسين بأولوية الموقع الذي سجل المهندس دخوله به:
1. **أولوية عالية**: نفس المدينة
2. **أولوية متوسطة**: نفس الدولة
3. **أولوية منخفضة**: باقي المشاريع

---

## 📋 التغييرات التي تمت

### 1. Project Model

**تم إضافة:**
- ✅ `country` (String, required) - الدولة
- ✅ `city` (String, required) - المدينة
- ✅ `location` (String, optional) - للتوافق مع الإصدارات القديمة

**Indexes:**
- ✅ `{ country: 1, city: 1 }` - للبحث السريع
- ✅ `{ country: 1 }` - للبحث حسب الدولة
- ✅ `{ city: 1 }` - للبحث حسب المدينة

---

### 2. User Model

**تم إضافة:**
- ✅ `country` (String, optional) - الدولة
- ✅ `city` (String, optional) - المدينة
- ✅ `location` (String, optional) - للتوافق مع الإصدارات القديمة

---

### 3. Project Controller

#### عند إنشاء Project:
```javascript
{
  "country": "السعودية",
  "city": "الرياض",
  // location يتم توليده تلقائياً: "الرياض, السعودية"
}
```

#### عند جلب Projects (Engineer):
- ✅ يتم ترتيب المشاريع حسب أولوية الموقع:
  1. نفس المدينة أولاً
  2. نفس الدولة ثانياً
  3. باقي المشاريع أخيراً

---

### 4. Validation

**تم تحديث:**
- ✅ `validateProject` - `country` و `city` required
- ✅ `validateProjectUpdate` - `country` و `city` optional
- ✅ `validateProfileUpdate` - `country` و `city` optional
- ✅ `validateUserUpdate` - `country` و `city` optional

---

## 🔄 Flow الكامل

### 1. إنشاء مشروع (Client)

```
POST /api/projects
Body:
{
  "title": "...",
  "description": "...",
  "country": "السعودية", ✅ Required
  "city": "الرياض", ✅ Required
  "projectType": "Construction",
  ...
}
```

**Response:**
```json
{
  "data": {
    "country": "السعودية",
    "city": "الرياض",
    "location": "الرياض, السعودية" // Auto-generated
  }
}
```

---

### 2. تحديث ملف المهندس

```
PUT /api/users/me
Body:
{
  "country": "السعودية",
  "city": "الرياض"
}
```

---

### 3. جلب المشاريع (Engineer)

```
GET /api/projects
Headers: Authorization: Bearer {{engineerToken}}
```

**الترتيب:**
1. ✅ مشاريع في نفس المدينة (الرياض)
2. ✅ مشاريع في نفس الدولة (السعودية - مدن أخرى)
3. ✅ باقي المشاريع

---

## 📡 API Endpoints

### Create Project
```
POST /api/projects
Body:
{
  "country": "السعودية", ✅ Required
  "city": "الرياض", ✅ Required
  ...
}
```

### Update Project
```
PUT /api/projects/:id
Body:
{
  "country": "السعودية", // Optional
  "city": "الرياض", // Optional
  ...
}
```

### Update Profile (Engineer)
```
PUT /api/users/me
Body:
{
  "country": "السعودية", // Optional
  "city": "الرياض", // Optional
  ...
}
```

### Get Projects (Engineer)
```
GET /api/projects
→ Returns projects sorted by location priority
```

---

## 🎯 الأولوية في الترتيب

### للمهندسين:

```javascript
// Priority 1: Same city
if (project.city === engineer.city) → Highest priority

// Priority 2: Same country, different city
if (project.country === engineer.country && project.city !== engineer.city) → Medium priority

// Priority 3: Different country
→ Lower priority

// Within each priority: Newest first
```

---

## 📝 ملاحظات مهمة

1. **Backward Compatibility:**
   - ✅ `location` field لا يزال موجود (optional)
   - ✅ يتم توليده تلقائياً من `country` و `city`

2. **User Location:**
   - ✅ المهندس يحتاج تحديث `country` و `city` في ملفه
   - ✅ يمكن تحديثها من `/api/users/me`

3. **Filtering:**
   - ✅ يمكن فلترة المشاريع بـ `?country=...` و `?city=...`
   - ✅ Backward compatibility: `?location=...` لا يزال يعمل

---

## ✅ Checklist

- [x] Project Model يحتوي على country و city
- [x] User Model يحتوي على country و city
- [x] Validation schemas محدثة
- [x] Project Controller يستخدم country و city
- [x] أولوية الموقع تعمل للمهندسين
- [x] Backward compatibility محفوظة

---

**📝 تاريخ التحديث**: ${new Date().toLocaleString('ar-SA')}
