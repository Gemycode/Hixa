# شرح API_PREFIX

## ما هو API_PREFIX؟

`API_PREFIX` هو متغير يحدد **البادئة الأساسية** لجميع مسارات الـ API في التطبيق.

---

## مثال توضيحي:

### لو كان `API_PREFIX = '/api/v1'`:
```
/api/v1/auth      ← تسجيل الدخول
/api/v1/users     ← المستخدمين
/api/v1/messages  ← الرسائل
```

### لو كان `API_PREFIX = '/api/'` (كما غيرتي):
```
/api/auth      ← تسجيل الدخول
/api/users     ← المستخدمين
/api/messages  ← الرسائل
```

---

## الفرق بين `/api/v1` و `/api/`:

### `/api/v1` (Versioning):
- ✅ أفضل للمشاريع الكبيرة
- ✅ يسمح بعمل أكثر من نسخة من الـ API
- ✅ مثال: `/api/v1/users` و `/api/v2/users` (نسختان مختلفتان)

### `/api/` (بدون Versioning):
- ✅ أبسط وأسهل
- ✅ مناسب للمشاريع المتوسطة والصغيرة
- ✅ المسارات أقصر

---

## التغيير الذي عملتيه:

**قبل:**
```javascript
const API_PREFIX = '/api/v1';
// المسارات: /api/v1/auth, /api/v1/users, إلخ
```

**بعد:**
```javascript
const API_PREFIX = '/api/';
// المسارات: /api/auth, /api/users, إلخ
```

---

## ⚠️ ملاحظة مهمة:

في ملف `app.js` يوجد **تكرار** في المسارات:

```javascript
// السطور 75-86: تستخدم API_PREFIX
app.use(`${API_PREFIX}/auth`, authRoutes);        // /api/auth
app.use(`${API_PREFIX}/chat-rooms`, chatRoomRoutes);  // /api/chat-rooms

// السطور 88-89: مسارات مباشرة بدون API_PREFIX
app.use('/api/auth', authRoutes);      // ⚠️ مكرر!
app.use('/api/portfolio', portfolioRoutes);  // ⚠️ مكرر!
```

**المشكلة**: المسار `/api/auth` سيعمل مرتين (مكرر)!

**الحل**: احذفي السطرين 88-89 أو استخدمي API_PREFIX لهم أيضاً.

---

## نصيحة:

إذا كنتي تريدين استخدام `/api/` بدون versioning (وهو الأبسط)، احذفي السطور المكررة أو غيريهم لاستخدام API_PREFIX أيضاً.
