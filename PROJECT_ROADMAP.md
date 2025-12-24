# خارطة طريق المشروع - Project Roadmap

## 🎯 الهدف: الوصول إلى نظام بروفيشينال كامل (90%+)

---

## 📅 المرحلة 1: إصلاحات حرجة (Week 1-2) - 🔴 أولوية عالية

### ✅ تم إكماله:
1. ✅ إصلاح Project Rooms للمهندسين
2. ✅ إضافة نظام الموافقة على المشاريع
3. ✅ إكمال نظام Proposals
4. ✅ إصلاح نظام الدردشة (Routes, WebSocket)

### 🔴 يحتاج إكمال فوري:
1. **إصلاح sender: "system" في Messages**
   - المشكلة: `sender: "system"` string لكن Model يتطلب ObjectId
   - الحل: إنشاء System User في DB أو جعل sender optional للرسائل النظامية

2. **نظام Forget Password**
   - `POST /api/auth/forgot-password`
   - `POST /api/auth/reset-password/:token`
   - Email Service Integration

3. **توحيد WebSocket/Socket**
   - حذف `socket.js` أو دمجه مع `websocket/websocket.js`
   - توحيد الاستخدام

---

## 📅 المرحلة 2: أنظمة أساسية ناقصة (Week 3-4) - 🔴 أولوية عالية

### 1. نظام Notifications
**المطلوب:**
- Notification Model
- Controller & Routes
- Real-time via WebSocket
- Email Notifications

**المسارات:**
```
GET    /api/notifications              - إشعاراتي
GET    /api/notifications/unread       - غير المقروءة
PATCH  /api/notifications/:id/read     - تحديد كمقروء
PATCH  /api/notifications/read-all     - قراءة الكل
DELETE /api/notifications/:id          - حذف إشعار
```

**أنواع الإشعارات:**
- مشروع جديد متاح
- عرض تم قبوله/رفضه
- رسالة جديدة
- مراجعة جديدة
- تغيير حالة المشروع

---

### 2. نظام Reviews & Ratings
**المطلوب:**
- Review Model
- Controller & Routes
- حساب متوسط التقييمات

**المسارات:**
```
POST   /api/reviews                    - إضافة مراجعة
GET    /api/reviews/user/:userId       - مراجعات مستخدم
GET    /api/reviews/project/:projectId - مراجعات مشروع
PUT    /api/reviews/:id                - تحديث مراجعة
DELETE /api/reviews/:id                - حذف مراجعة
POST   /api/reviews/:id/helpful        - تقييم المراجعة
```

---

## 📅 المرحلة 3: تحسينات (Week 5-6) - 🟡 أولوية متوسطة

### 1. Dashboard شامل
- Admin Dashboard
- Engineer Dashboard
- Client Dashboard

### 2. Email Service
- Email Verification
- Welcome Emails
- Notification Emails

### 3. نظام الأرشيف
- أرشفة المشاريع المكتملة
- أرشفة الدردشات

---

## 📅 المرحلة 4: بروفيشينال (Week 7-8) - 🟢 أولوية منخفضة

### 1. Documentation
- Swagger/OpenAPI
- Postman Collection
- README شامل

### 2. Testing
- Unit Tests (Coverage > 80%)
- Integration Tests
- E2E Tests

### 3. Monitoring & Logging
- Error Tracking (Sentry)
- Performance Monitoring
- Health Check

### 4. CI/CD
- GitHub Actions
- Automated Deployment

---

## 📊 الأولويات النهائية

### 🔴 حرج (يجب عمله فوراً):
1. ✅ إصلاح Project Rooms - تم
2. ⚠️ إصلاح sender: "system"
3. Forget Password
4. Notifications (أساسي)

### 🟡 عالي (أسبوع 2-3):
5. Reviews & Ratings
6. Email Verification
7. Dashboard شامل
8. توحيد WebSocket

### 🟢 متوسط (أسبوع 4+):
9. Payments
10. Documentation
11. Testing
12. Monitoring

---

**📝 آخر تحديث**: ${new Date().toLocaleString('ar-SA')}
