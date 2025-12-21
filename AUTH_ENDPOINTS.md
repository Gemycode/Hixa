# توثيق نقاط نهاية نظام المصادقة (Auth Endpoints)

## 📍 Endpoints المتاحة

### 1. تسجيل الشركة (Company Registration)
**POST** `/api/auth/register/company`

**Body:**
```json
{
  "companyName": "اسم الشركة",
  "contactPersonName": "اسم الشخص المسؤول",
  "email": "company@example.com",
  "password": "Password123",
  "confirmPassword": "Password123"
}
```

**Response (201):**
```json
{
  "message": "تم تسجيل الشركة بنجاح",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "company@example.com",
    "name": "اسم الشخص المسؤول",
    "companyName": "اسم الشركة",
    "contactPersonName": "اسم الشخص المسؤول",
    "role": "company"
  }
}
```

---

### 2. تسجيل المهندس (Engineer Registration)
**POST** `/api/auth/register/engineer`

**Body:**
```json
{
  "fullName": "الاسم الكامل للمهندس",
  "specialization": "Civil Engineer, Electrical Engineer",
  "licenseNumber": "رقم الرخصة المهنية",
  "email": "engineer@example.com",
  "password": "Password123",
  "confirmPassword": "Password123"
}
```

**Response (201):**
```json
{
  "message": "تم تسجيل المهندس بنجاح",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "engineer@example.com",
    "name": "الاسم الكامل للمهندس",
    "licenseNumber": "رقم الرخصة المهنية",
    "specializations": ["Civil Engineer", "Electrical Engineer"],
    "role": "engineer"
  }
}
```

---

### 3. تسجيل العميل (Client Registration)
**POST** `/api/auth/register/client`

**Body:**
```json
{
  "fullName": "الاسم الكامل للعميل",
  "email": "client@example.com",
  "password": "Password123",
  "confirmPassword": "Password123"
}
```

**Response (201):**
```json
{
  "message": "تم تسجيل العميل بنجاح",
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "client@example.com",
    "name": "الاسم الكامل للعميل",
    "role": "client"
  }
}
```

---

### 4. تسجيل الدخول (Login)
**POST** `/api/auth/login`

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
  "token": "jwt_token_here",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "اسم المستخدم",
    "role": "company|engineer|client|admin"
  }
}
```

---

## 🔒 متطلبات كلمة المرور

- **الحد الأدنى:** 8 أحرف
- **يجب أن تحتوي على:**
  - حرف كبير واحد على الأقل (A-Z)
  - حرف صغير واحد على الأقل (a-z)
  - رقم واحد على الأقل (0-9)
  - يمكن استخدام: `@$!%*?&`

---

## ⚠️ أخطاء شائعة

### 409 Conflict - البريد الإلكتروني مستخدم بالفعل
```json
{
  "message": "البريد الإلكتروني مستخدم بالفعل"
}
```

### 409 Conflict - رقم الرخصة مستخدم (للمهندسين فقط)
```json
{
  "message": "رقم الرخصة المهنية مستخدم بالفعل"
}
```

### 400 Bad Request - Validation Error
```json
{
  "message": "رسائل الخطأ منفصلة بفواصل"
}
```

### 401 Unauthorized - بيانات الدخول غير صحيحة
```json
{
  "message": "بيانات الدخول غير صحيحة"
}
```

### 403 Forbidden - الحساب غير مفعّل
```json
{
  "message": "الحساب غير مفعّل"
}
```

---

## 📝 ملاحظات

1. **Rate Limiting:** جميع endpoints محدودة بـ 5 طلبات كل 15 دقيقة
2. **Confirm Password:** لا يتم حفظه في قاعدة البيانات، فقط للتحقق
3. **Specialization:** يمكن إرساله كـ string مفصول بفواصل أو array
4. **License Number:** يجب أن يكون فريداً لكل مهندس
5. **Company Name:** خاص بالشركات فقط
6. **Contact Person Name:** خاص بالشركات فقط

---

## 🔄 الأدوار المتاحة

- `admin` - المسؤول
- `engineer` - المهندس
- `client` - العميل
- `company` - الشركة

**ملاحظة:** تم استبدال `customer` بـ `company` في النظام.


