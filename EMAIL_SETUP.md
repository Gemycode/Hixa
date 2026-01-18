# إعداد إرسال الإيميل - Email Setup Guide

## المتطلبات

### 1. تثبيت nodemailer
```bash
cd Hixa-back
npm install nodemailer
```

### 2. إضافة متغيرات البيئة إلى `.env`

افتح ملف `.env` في مجلد `Hixa-back/` وأضف المتغيرات التالية:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password-here

# Frontend URL (لرابط إعادة تعيين كلمة المرور)
FRONTEND_URL=http://localhost:3000
```

## إعداد Gmail (الأسهل)

### الخطوة 1: تفعيل التحقق بخطوتين
1. اذهب إلى [Google Account Security](https://myaccount.google.com/security)
2. فعّل **2-Step Verification**

### الخطوة 2: إنشاء App Password
1. اذهب إلى [App Passwords](https://myaccount.google.com/apppasswords)
2. اختر **Mail** و **Other (Custom name)**
3. أدخل اسم: `Hixa Backend`
4. انسخ **App Password** (16 حرف بدون مسافات)
5. ضع هذا الـ password في `SMTP_PASS` في ملف `.env`

### الخطوة 3: إعداد `.env`
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx  # App Password (16 حرف)
FRONTEND_URL=http://localhost:3000
```

## إعداد مزودي إيميل آخرين

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
```

### Yahoo
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your-app-password
```

### SendGrid (موصى به للإنتاج)
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### Mailgun
```env
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-mailgun-username
SMTP_PASS=your-mailgun-password
```

## اختبار الإعداد

### 1. أعد تشغيل السيرفر
```bash
cd Hixa-back
npm run dev
```

### 2. اختبر إرسال إيميل
استخدم Postman أو أي API client:

**POST** `http://localhost:5000/api/auth/forgot-password`

**Body:**
```json
{
  "email": "test@example.com"
}
```

### 3. تحقق من Console
يجب أن ترى:
```
✅ Password reset email sent: <message-id>
```

## استكشاف الأخطاء

### خطأ: "Invalid login"
- **الحل**: تأكد من استخدام **App Password** وليس كلمة المرور العادية (لـ Gmail)
- تأكد من تفعيل **2-Step Verification**

### خطأ: "Connection timeout"
- **الحل**: تحقق من `SMTP_HOST` و `SMTP_PORT`
- تأكد من أن Firewall لا يحجب المنفذ

### خطأ: "Authentication failed"
- **الحل**: تحقق من `SMTP_USER` و `SMTP_PASS`
- تأكد من عدم وجود مسافات في App Password

### الإيميل لا يصل
- تحقق من مجلد **Spam/Junk**
- تأكد من أن `FRONTEND_URL` صحيح
- تحقق من Console للأخطاء

## ملاحظات مهمة

1. **لـ Gmail**: استخدم **App Password** وليس كلمة المرور العادية
2. **لـ Production**: استخدم خدمة احترافية مثل SendGrid أو Mailgun
3. **Rate Limiting**: Gmail يحد من عدد الإيميلات (حوالي 500 يومياً)
4. **Security**: لا تشارك ملف `.env` أبداً

## المتغيرات المطلوبة

| المتغير | الوصف | مثال |
|---------|-------|------|
| `SMTP_HOST` | عنوان SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | منفذ SMTP | `587` |
| `SMTP_SECURE` | استخدام SSL/TLS | `false` (للمنفذ 587) |
| `SMTP_USER` | البريد الإلكتروني المرسل | `your-email@gmail.com` |
| `SMTP_PASS` | كلمة المرور أو App Password | `xxxx xxxx xxxx xxxx` |
| `FRONTEND_URL` | رابط Frontend (لرابط إعادة التعيين) | `http://localhost:3000` |

## الخطوات السريعة

1. ✅ تثبيت nodemailer: `npm install nodemailer`
2. ✅ إضافة متغيرات `.env`
3. ✅ إنشاء App Password (لـ Gmail)
4. ✅ إعادة تشغيل السيرفر
5. ✅ اختبار الإرسال

---

**تاريخ الإنشاء**: ${new Date().toLocaleString('ar-SA')}
