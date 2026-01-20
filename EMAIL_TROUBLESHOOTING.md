# استكشاف أخطاء البريد الإلكتروني - Email Troubleshooting

## المشكلة الحالية: ETIMEDOUT

إذا رأيت خطأ `ETIMEDOUT` أو `ESOCKET`, هذا يعني أن الاتصال بخادم SMTP فشل.

## الحلول

### 1. إذا كنت تستخدم Mailtrap (للاختبار)

**المشكلة:** Mailtrap قد يكون محجوباً أو credentials خاطئة.

**الحل:**
1. تأكد من تسجيل الدخول إلى [Mailtrap](https://mailtrap.io)
2. اذهب إلى **Email Testing** > **Inboxes**
3. اختر Inbox وانسخ الـ credentials:
   - **Host:** `sandbox.smtp.mailtrap.io`
   - **Port:** `2525` أو `587`
   - **Username:** من Mailtrap dashboard
   - **Password:** من Mailtrap dashboard

4. تأكد من أن `.env` يحتوي على:
```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=your-mailtrap-username
SMTP_PASS=your-mailtrap-password
```

### 2. إذا كنت تستخدم Gmail

**المشكلة:** Gmail يحتاج App Password وليس كلمة المرور العادية.

**الحل:**
1. اذهب إلى [Google Account Security](https://myaccount.google.com/security)
2. فعّل **2-Step Verification**
3. اذهب إلى [App Passwords](https://myaccount.google.com/apppasswords)
4. أنشئ App Password جديد
5. استخدمه في `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
```

### 3. مشاكل Firewall/Network

**المشكلة:** Firewall أو Network يحجب الاتصال.

**الحل:**
1. تأكد من أن Port 587 أو 2525 غير محجوب
2. جرب استخدام Port 465 مع `SMTP_SECURE=true`:
```env
SMTP_PORT=465
SMTP_SECURE=true
```

### 4. اختبار الاتصال

شغّل سكريبت الاختبار:
```bash
cd Hixa-back
node scripts/test-email.js
```

## أخطاء شائعة

### ❌ "Invalid login" أو "EAUTH"
- **السبب:** Username أو Password خاطئ
- **الحل:** تحقق من credentials في `.env`

### ❌ "ETIMEDOUT" أو "ESOCKET"
- **السبب:** فشل الاتصال بخادم SMTP
- **الحل:** 
  - تحقق من `SMTP_HOST` و `SMTP_PORT`
  - تحقق من Firewall/Network
  - جرب مزود إيميل آخر

### ❌ "Connection refused"
- **السبب:** Port محجوب أو خاطئ
- **الحل:** جرب Port آخر (587, 465, 2525)

### ❌ "Email sending timeout"
- **السبب:** الخادم بطيء أو غير متاح
- **الحل:** 
  - تحقق من اتصال الإنترنت
  - جرب مزود إيميل آخر
  - زد timeout في الكود

## بدائل للاختبار

### 1. Mailtrap (موصى به للاختبار)
- مجاني للاختبار
- لا يرسل إيميلات حقيقية
- يعرض الإيميلات في Dashboard

### 2. Gmail (للاختبار الشخصي)
- يحتاج App Password
- حد أقصى 500 إيميل يومياً
- مجاني

### 3. SendGrid (للإنتاج)
- موثوق للإنتاج
- 100 إيميل مجاني يومياً
- يحتاج تسجيل حساب

### 4. Mailgun (للإنتاج)
- موثوق للإنتاج
- 5000 إيميل مجاني شهرياً
- يحتاج تسجيل حساب

## خطوات سريعة

1. ✅ تحقق من `.env` - جميع المتغيرات موجودة
2. ✅ شغّل `node scripts/test-email.js`
3. ✅ تحقق من Console في Backend عند إرسال إيميل
4. ✅ تحقق من Mailtrap Dashboard (إذا كنت تستخدمه)

---

**ملاحظة:** إذا استمرت المشكلة، استخدم Gmail مع App Password للاختبار السريع.
