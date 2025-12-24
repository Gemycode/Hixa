# دليل مسارات المصادقة - Auth Endpoints Guide

## 📌 Base URL
`https://hixa.onrender.com/api/auth` أو `http://localhost:5000/api/auth`

---

## 1️⃣ تسجيل الشركات (Company Registration)

### `POST /api/auth/register/company`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "companyName": "شركة البناء المثالي",
  "contactPersonName": "أحمد محمد",
  "email": "company@example.com",
  "password": "Company123",
  "confirmPassword": "Company123"
}
```

**Validation:**
- `companyName`: مطلوب، 2-200 حرف
- `contactPersonName`: مطلوب، 2-100 حرف
- `email`: مطلوب، صيغة بريد صحيحة
- `password`: مطلوب، 8 أحرف على الأقل، حرف كبير وصغير ورقم
- `confirmPassword`: مطلوب، يجب أن يطابق password

**Response (201):**
```json
{
  "message": "تم تسجيل الشركة بنجاح",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "email": "company@example.com",
    "name": "شركة البناء المثالي",
    "role": "client"
  }
}
```

---

## 2️⃣ تسجيل المهندسين (Engineer Registration)

### `POST /api/auth/register/engineer`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "fullName": "محمد علي حسن",
  "specialization": "Civil Engineer",
  "licenseNumber": "ENG-12345",
  "email": "engineer@example.com",
  "password": "Engineer123",
  "confirmPassword": "Engineer123"
}
```

**Validation:**
- `fullName`: مطلوب، 2-100 حرف
- `specialization`: مطلوب، 2-100 حرف (مثل: Civil Engineer, Electrical Engineer)
- `licenseNumber`: مطلوب، 1-50 حرف، فريد
- `email`: مطلوب، صيغة بريد صحيحة
- `password`: مطلوب، 8 أحرف على الأقل، حرف كبير وصغير ورقم
- `confirmPassword`: مطلوب، يجب أن يطابق password

**Response (201):**
```json
{
  "message": "تم تسجيل المهندس بنجاح",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "email": "engineer@example.com",
    "name": "محمد علي حسن",
    "role": "engineer",
    "specializations": ["Civil Engineer"],
    "nationalId": "ENG-12345"
  }
}
```

---

## 3️⃣ تسجيل العملاء (Client Registration)

### `POST /api/auth/register/client`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "fullName": "سارة أحمد",
  "email": "client@example.com",
  "password": "Client123",
  "confirmPassword": "Client123"
}
```

**Validation:**
- `fullName`: مطلوب، 2-100 حرف
- `email`: مطلوب، صيغة بريد صحيحة
- `password`: مطلوب، 8 أحرف على الأقل، حرف كبير وصغير ورقم
- `confirmPassword`: مطلوب، يجب أن يطابق password

**Response (201):**
```json
{
  "message": "تم تسجيل العميل بنجاح",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "email": "client@example.com",
    "name": "سارة أحمد",
    "role": "client"
  }
}
```

---

## 4️⃣ تسجيل الدخول (Login)

### `POST /api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (200):**
```json
{
  "message": "تم تسجيل الدخول بنجاح",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "...",
    "email": "user@example.com",
    "name": "...",
    "role": "..."
  }
}
```

---

## 5️⃣ تغيير كلمة المرور (Change Password)

### `PUT /api/auth/change-password`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Body:**
```json
{
  "currentPassword": "OldPassword123",
  "newPassword": "NewPassword123",
  "confirmNewPassword": "NewPassword123"
}
```

**Validation:**
- `currentPassword`: مطلوب
- `newPassword`: مطلوب، 8 أحرف على الأقل، حرف كبير وصغير ورقم
- `confirmNewPassword`: مطلوب، يجب أن يطابق newPassword

**Response (200):**
```json
{
  "message": "تم تغيير كلمة المرور بنجاح"
}
```

---

## 🧪 أمثلة للاختبار في API Dog / Postman

### مثال 1: تسجيل شركة
```http
POST https://hixa.onrender.com/api/auth/register/company
Content-Type: application/json

{
  "companyName": "شركة البناء المثالي",
  "contactPersonName": "أحمد محمد علي",
  "email": "company1@test.com",
  "password": "Company123",
  "confirmPassword": "Company123"
}
```

### مثال 2: تسجيل مهندس
```http
POST https://hixa.onrender.com/api/auth/register/engineer
Content-Type: application/json

{
  "fullName": "محمد علي حسن",
  "specialization": "Civil Engineer",
  "licenseNumber": "ENG-001",
  "email": "engineer1@test.com",
  "password": "Engineer123",
  "confirmPassword": "Engineer123"
}
```

### مثال 3: تسجيل عميل
```http
POST https://hixa.onrender.com/api/auth/register/client
Content-Type: application/json

{
  "fullName": "سارة أحمد محمد",
  "email": "client1@test.com",
  "password": "Client123",
  "confirmPassword": "Client123"
}
```

### مثال 4: تسجيل دخول
```http
POST https://hixa.onrender.com/api/auth/login
Content-Type: application/json

{
  "email": "engineer1@test.com",
  "password": "Engineer123"
}
```

### مثال 5: تغيير كلمة المرور
```http
PUT https://hixa.onrender.com/api/auth/change-password
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "currentPassword": "Engineer123",
  "newPassword": "NewPassword123",
  "confirmNewPassword": "NewPassword123"
}
```

---

## ⚠️ ملاحظات مهمة

### 1. Rate Limiting
- جميع مسارات المصادقة محمية بـ rate limiting
- 5 محاولات كل 15 دقيقة
- إذا تجاوزت الحد، ستحصلين على: `تم تجاوز عدد محاولات الدخول المسموح بها`

### 2. كلمة المرور
- يجب أن تحتوي على: **8 أحرف على الأقل**
- حرف **كبير** (A-Z)
- حرف **صغير** (a-z)
- رقم **واحد على الأقل** (0-9)

### 3. الأخطاء الشائعة

**409 Conflict:**
```json
{
  "message": "البريد الإلكتروني مستخدم بالفعل"
}
```
أو
```json
{
  "message": "رقم الترخيص مستخدم بالفعل"
}
```

**400 Bad Request:**
```json
{
  "message": "اسم الشركة مطلوب, البريد الإلكتروني غير صحيح"
}
```

**401 Unauthorized:**
```json
{
  "message": "بيانات الدخول غير صحيحة"
}
```

**403 Forbidden:**
```json
{
  "message": "الحساب غير مفعّل"
}
```

---

## ✅ Checklist للاختبار

- [ ] تسجيل شركة جديدة
- [ ] تسجيل شركة ببريد مستخدم (يجب أن يرفض)
- [ ] تسجيل مهندس جديد
- [ ] تسجيل مهندس برقم ترخيص مستخدم (يجب أن يرفض)
- [ ] تسجيل عميل جديد
- [ ] تسجيل عميل ببريد مستخدم (يجب أن يرفض)
- [ ] تسجيل دخول بحساب صحيح
- [ ] تسجيل دخول ببيانات خاطئة (يجب أن يرفض)
- [ ] تسجيل دخول بحساب غير مفعّل (يجب أن يرفض)
- [ ] تغيير كلمة المرور (مع token صحيح)
- [ ] تغيير كلمة المرور بكلمة مرور حالية خاطئة (يجب أن يرفض)
- [ ] تغيير كلمة المرور بدون token (يجب أن يرفض)

---

## 📝 ملاحظات إضافية

1. **الـ Token**: بعد التسجيل أو تسجيل الدخول، احفظي الـ `token` لاستخدامه في الطلبات المحمية
2. **الدور (Role)**: 
   - Company → `client`
   - Engineer → `engineer`
   - Client → `client`
3. **البيانات المحفوظة**:
   - Company: `companyName` محفوظ في `name`، `contactPersonName` محفوظ في `bio`
   - Engineer: `fullName` في `name`، `specialization` في `specializations[]`، `licenseNumber` في `nationalId`
   - Client: `fullName` في `name`

---

**🎉 جاهز للاختبار!**
