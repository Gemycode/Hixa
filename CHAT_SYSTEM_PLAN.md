# خطة عمل نظام الشات - HIXA Backend

## 📋 تحليل المتطلبات والسيناريوهات

### 🎯 المفهوم الأساسي:
**كل الشاتات الخاصة بمشروع واحد تكون مجمعة في مكان واحد (ProjectRoom)**

### 📱 Dashboard Structure:
```
Dashboard (قائمة غرف المشاريع)
├── ProjectRoom 1 (مشروع تصميم منزل)
│   ├── ChatRoom: Admin ↔ Engineer 1
│   ├── ChatRoom: Admin ↔ Engineer 2
│   ├── ChatRoom: Admin ↔ Client
│   └── ChatRoom: Group (بعد التوظيف)
│
├── ProjectRoom 2 (مشروع بناء جسر)
│   ├── ChatRoom: Admin ↔ Engineer 1
│   ├── ChatRoom: Admin ↔ Client
│   └── ChatRoom: Group (بعد التوظيف)
│
└── ProjectRoom 3 (مشروع ترميم)
    └── ...
```

### السيناريو الكامل:

#### المرحلة 1: تقديم عرض على المشروع
1. **العميل** ينشر مشروع بتفاصيله
2. **المهندس** يقدم عرض (Proposal) على المشروع
3. عند تقديم أول عرض → **يتم إنشاء ProjectRoom للمشروع تلقائياً**
4. **في Dashboard**: يظهر ProjectRoom جديد في القائمة
5. **عند الدخول على ProjectRoom**:
   - **للمهندس**: يرى فقط ChatRoom بينه وبين الأدمن (لا يرى المهندسين الآخرين)
   - **للعميل**: يرى فقط ChatRoom بينه وبين الأدمن (لا يرى المهندسين)
   - **للأدمن**: يرى جميع ChatRooms:
     - ChatRoom مع كل مهندس قدم عرض
     - ChatRoom مع العميل
     - ChatRoom Group (إن وجد بعد التوظيف)
   - يظهر للأدمن في ChatRoom مع المهندس: "المهندس [اسم] قام بتقديم عرض - تواصل معه لعمل انترفيو"

#### المرحلة 2: التواصل والانترفيو
5. **الأدمن** يتواصل مع المهندس عبر الشات لعمل انترفيو
6. **الأدمن** يبلغ **العميل** بنتائج الانترفيو عبر الشات

#### المرحلة 3: التوظيف
7. **الأدمن** يقوم بتوظيف مهندس للمشروع
8. بعد التوظيف → **يتم إنشاء شات جماعي** بين:
   - العميل
   - المهندس الموظف
   - الأدمن (يشاهد الرسائل فقط)

---

## 🗄️ نماذج قاعدة البيانات المطلوبة

### 1. Proposal Model (نموذج العروض)
```javascript
{
  project: ObjectId (ref: Project),
  engineer: ObjectId (ref: User),
  message: String,
  proposedBudget: { amount: Number, currency: String },
  estimatedDuration: String,
  status: enum ['pending', 'reviewed', 'accepted', 'rejected'],
  createdAt: Date
}
```

### 2. ProjectRoom Model (غرفة المشروع) - Container للشاتات
```javascript
{
  project: ObjectId (ref: Project), // unique
  // معلومات إضافية للعرض في Dashboard
  projectTitle: String, // cached من Project
  lastActivityAt: Date, // آخر نشاط في أي ChatRoom
  unreadCount: Number, // عدد الرسائل غير المقروءة (حسب المستخدم)
  status: enum ['active', 'closed'],
  createdAt: Date,
  closedAt: Date
}
```

### 3. ChatRoom Model (غرفة الشات) - داخل ProjectRoom
```javascript
{
  project: ObjectId (ref: Project),
  projectRoom: ObjectId (ref: ProjectRoom), // **مطلوب** - الربط بغرفة المشروع
  type: enum ['admin-engineer', 'admin-client', 'group'], // نوع الشات
  // للمساعدة في التصفية والبحث
  engineer: ObjectId (ref: User), // فقط إذا type = 'admin-engineer'
  // معلومات للعرض
  lastMessage: {
    content: String,
    sender: ObjectId (ref: User),
    createdAt: Date
  },
  unreadCount: Number, // عدد الرسائل غير المقروءة (حسب المستخدم)
  participants: [
    {
      user: ObjectId (ref: User),
      role: String, // 'admin', 'engineer', 'client'
      joinedAt: Date,
      lastReadAt: Date
    }
  ],
  status: enum ['active', 'archived'],
  createdAt: Date
}
```

### 4. Message Model (الرسائل)
```javascript
{
  chatRoom: ObjectId (ref: ChatRoom),
  sender: ObjectId (ref: User),
  content: String,
  type: enum ['text', 'file', 'system'], // system للرسائل التلقائية
  attachments: [{
    name: String,
    url: String,
    type: String
  }],
  readBy: [{
    user: ObjectId (ref: User),
    readAt: Date
  }],
  createdAt: Date
}
```

---

## 🔄 Flow التفصيلي

### Flow 1: تقديم عرض جديد
```
1. Engineer يقدم Proposal على Project
2. Check: هل يوجد ProjectRoom للمشروع؟
   - لا → إنشاء ProjectRoom جديد
   - نعم → استخدام الموجود
3. Check: هل يوجد ChatRoom بين Admin و Engineer؟
   - لا → إنشاء ChatRoom نوع 'admin-engineer'
   - نعم → استخدام الموجود
4. Check: هل يوجد ChatRoom بين Admin و Client؟
   - لا → إنشاء ChatRoom نوع 'admin-client'
   - نعم → استخدام الموجود
5. إرسال رسالة system في ChatRoom Admin-Engineer:
   "المهندس [اسم] قام بتقديم عرض على المشروع - تواصل معه لعمل انترفيو"
```

### Flow 2: بعد التوظيف
```
1. Admin يقوم بتوظيف Engineer (تحديث Project.assignedEngineer)
2. Check: هل يوجد ChatRoom نوع 'group' للمشروع؟
   - لا → إنشاء ChatRoom جديد نوع 'group'
   - نعم → استخدام الموجود
3. إضافة Participants:
   - Client
   - Engineer الموظف
   - Admin
4. إرسال رسالة system:
   "تم توظيف المهندس [اسم] للمشروع - يمكنكم الآن التواصل مباشرة"
```

---

## 📡 API Endpoints المطلوبة

### 🔄 Flow الاستخدام:
```
1. المستخدم يفتح Dashboard
   → GET /api/project-rooms
   → يعرض قائمة ProjectRooms

2. المستخدم يختار ProjectRoom
   → GET /api/project-rooms/:roomId/chat-rooms
   → يعرض جميع ChatRooms داخل هذا ProjectRoom

3. المستخدم يختار ChatRoom
   → GET /api/messages/room/:chatRoomId
   → يعرض الرسائل
   → Socket.io للرسائل المباشرة
```

### Proposals (العروض)
- `POST /api/proposals` - تقديم عرض (Engineer only)
- `GET /api/proposals/project/:projectId` - جلب عروض مشروع معين
- `GET /api/proposals/my-proposals` - جلب عروضي (Engineer)
- `PUT /api/proposals/:id/status` - تحديث حالة العرض (Admin only)

### Project Rooms (غرف المشاريع) - Dashboard الرئيسي
- `GET /api/project-rooms` - جلب قائمة جميع ProjectRooms (Dashboard)
  - **Admin**: يرى جميع ProjectRooms
  - **Client**: يرى ProjectRooms لمشاريعه فقط
  - **Engineer**: يرى ProjectRooms للمشاريع التي قدم عليها عرض
- `GET /api/project-rooms/:roomId` - جلب تفاصيل ProjectRoom معين
- `GET /api/project-rooms/project/:projectId` - جلب ProjectRoom لمشروع معين

### Chat Rooms (غرف الشات) - داخل ProjectRoom
- `GET /api/project-rooms/:roomId/chat-rooms` - **جلب جميع ChatRooms داخل ProjectRoom معين**
  - هذا هو الـ Endpoint الرئيسي عند فتح ProjectRoom
  - يعيد جميع ChatRooms المرتبطة بهذا المشروع
  - كل مستخدم يرى فقط ChatRooms التي له صلاحية عليها
- `GET /api/chat-rooms/:roomId` - جلب تفاصيل ChatRoom معين
- `GET /api/chat-rooms/my-rooms` - جلب جميع ChatRooms الخاصة بي (عبر جميع المشاريع)
- `POST /api/chat-rooms` - إنشاء غرفة شات (Admin only - نادر الاستخدام)

### Messages (الرسائل)
- `POST /api/messages` - إرسال رسالة
- `GET /api/messages/room/:roomId` - جلب رسائل غرفة معينة
- `PUT /api/messages/:messageId/read` - تحديد الرسالة كمقروءة
- `GET /api/messages/unread-count` - عدد الرسائل غير المقروءة

---

## 🔐 قواعد الصلاحيات (Authorization)

### ProjectRoom Visibility (في Dashboard):
- **Admin**: يرى جميع ProjectRooms
- **Client**: يرى ProjectRooms لمشاريعه فقط
- **Engineer**: يرى ProjectRooms للمشاريع التي قدم عليها عرض

### ChatRoom Visibility (داخل ProjectRoom):
- **Admin**: يرى **جميع** ChatRooms داخل ProjectRoom:
  - جميع ChatRooms مع المهندسين
  - ChatRoom مع العميل
  - ChatRoom Group (إن وجد)
- **Client**: يرى فقط ChatRooms التي هو participant فيها:
  - ChatRoom مع الأدمن
  - ChatRoom Group (بعد التوظيف)
- **Engineer**: يرى فقط ChatRooms التي هو participant فيها:
  - ChatRoom مع الأدمن (خاص به فقط)
  - ChatRoom Group (إن كان هو الموظف)

### Message Permissions:
- **Admin**: يمكنه الإرسال في جميع ChatRooms
- **Client**: يمكنه الإرسال في ChatRooms التي هو participant فيها
- **Engineer**: يمكنه الإرسال في ChatRooms التي هو participant فيها
- **System Messages**: يتم إنشاؤها تلقائياً عند أحداث معينة

---

## 🛠️ التقنيات المطلوبة

### Real-time Communication:
- **Socket.io** أو **WebSockets** للشات المباشر
- يحتاج تثبيت: `npm install socket.io`

### File Uploads:
- موجود بالفعل (Cloudinary)
- يمكن استخدامه لرفع ملفات في الشات

---

## 📝 خطوات التنفيذ

### المرحلة 1: إعداد قاعدة البيانات
1. ✅ إنشاء Proposal Model
2. ✅ إنشاء ProjectRoom Model
3. ✅ إنشاء ChatRoom Model
4. ✅ إنشاء Message Model
5. ✅ إضافة Indexes للاستعلامات السريعة

### المرحلة 2: API Endpoints الأساسية
1. ✅ Proposal Controller & Routes
2. ✅ ProjectRoom Controller & Routes
3. ✅ ChatRoom Controller & Routes
4. ✅ Message Controller & Routes
5. ✅ Validation Middleware

### المرحلة 3: Business Logic
1. ✅ Auto-create ProjectRoom عند أول Proposal
2. ✅ Auto-create ChatRooms عند Proposal جديد
3. ✅ Auto-create Group ChatRoom عند التوظيف
4. ✅ System Messages Logic

### المرحلة 4: Real-time Communication
1. ✅ إعداد Socket.io Server
2. ✅ Socket Events للرسائل
3. ✅ Socket Events للـ Typing Indicators
4. ✅ Socket Events للـ Online Status

### المرحلة 5: Testing & Optimization
1. ✅ Unit Tests
2. ✅ Integration Tests
3. ✅ Performance Optimization
4. ✅ Error Handling

---

## 🎯 نقاط مهمة للتنفيذ

### 1. عند تقديم Proposal:
```javascript
// في proposalController.js
1. إنشاء/تحديث ProjectRoom (إذا لم يكن موجود)
2. إنشاء/استخدام ChatRoom نوع 'admin-engineer' (ربط بـ ProjectRoom)
3. إنشاء/استخدام ChatRoom نوع 'admin-client' (ربط بـ ProjectRoom)
4. إرسال System Message في ChatRoom Admin-Engineer
```

### 1.5. عند فتح ProjectRoom في Dashboard:
```javascript
// في projectRoomController.js
GET /api/project-rooms/:roomId/chat-rooms
- جلب جميع ChatRooms المرتبطة بهذا ProjectRoom
- تصفية حسب صلاحيات المستخدم:
  * Admin: جميع ChatRooms
  * Client: ChatRooms التي هو participant فيها
  * Engineer: ChatRooms التي هو participant فيها
- إرجاع معلومات إضافية:
  * آخر رسالة في كل ChatRoom
  * عدد الرسائل غير المقروءة
  * معلومات المشاركين
```

### 2. عند التوظيف:
```javascript
// في projectController.js (updateProject)
- عند تحديث assignedEngineer
- إنشاء/تحديث Group ChatRoom
- إضافة Participants
- إرسال System Message
```

### 3. عند إرسال رسالة:
```javascript
// في messageController.js
- التحقق من الصلاحيات
- حفظ الرسالة
- إرسال عبر Socket.io
- تحديث lastReadAt
```

---

## 📊 Database Indexes المطلوبة

```javascript
// Proposal
- { project: 1, engineer: 1 } // unique
- { project: 1, createdAt: -1 }
- { engineer: 1, status: 1 }

// ProjectRoom
- { project: 1 } // unique
- { status: 1, createdAt: -1 }

// ChatRoom
- { projectRoom: 1, type: 1 } // للبحث داخل ProjectRoom
- { project: 1, type: 1 }
- { projectRoom: 1, createdAt: -1 } // للترتيب داخل ProjectRoom
- { 'participants.user': 1 }
- { engineer: 1 } // للبحث السريع
- { status: 1, createdAt: -1 }

// Message
- { chatRoom: 1, createdAt: -1 }
- { sender: 1, createdAt: -1 }
- { 'readBy.user': 1 }
```

---

## 🔔 System Messages Templates

1. **عند تقديم عرض جديد:**
   ```
   "المهندس [اسم المهندس] قام بتقديم عرض على المشروع [عنوان المشروع]. 
   تواصل معه لعمل انترفيو."
   ```

2. **عند التوظيف:**
   ```
   "تم توظيف المهندس [اسم المهندس] للمشروع [عنوان المشروع]. 
   يمكنكم الآن التواصل مباشرة."
   ```

3. **عند رفض عرض:**
   ```
   "تم رفض عرضك على المشروع [عنوان المشروع]."
   ```

---

## ✅ Checklist قبل البدء

- [ ] فهم المتطلبات بشكل كامل
- [ ] مراجعة البنية الحالية للمشروع
- [ ] تحديد التقنيات الإضافية المطلوبة
- [ ] تصميم قاعدة البيانات
- [ ] تصميم API Endpoints
- [ ] التخطيط للـ Real-time Communication
- [ ] تحديد قواعد الصلاحيات
- [ ] التخطيط للاختبارات

---

## 📌 ملاحظات إضافية

1. **الأمان**: يجب التأكد من أن كل مستخدم يرى فقط ما له صلاحية عليه
2. **الأداء**: 
   - استخدام Pagination للرسائل القديمة
   - Cache معلومات ProjectRoom في Dashboard
   - تحديث `lastActivityAt` و `unreadCount` بشكل async
3. **التخزين**: تحديد حد أقصى لحجم الرسائل والملفات
4. **الإشعارات**: يمكن إضافة نظام إشعارات لاحقاً
5. **الأرشفة**: أرشفة الرسائل القديمة لتحسين الأداء
6. **Dashboard Optimization**:
   - ترتيب ProjectRooms حسب `lastActivityAt`
   - عرض `unreadCount` لكل ProjectRoom
   - عرض آخر رسالة من آخر ChatRoom نشط

## 🎨 UI/UX Structure

### Dashboard View:
```
┌─────────────────────────────────────┐
│  Messages Dashboard                 │
├─────────────────────────────────────┤
│  🔍 Search Projects...              │
├─────────────────────────────────────┤
│  📁 Project: تصميم منزل             │
│     Last: "المهندس أحمد قدم عرض"    │
│     🔴 3 unread                     │
│     ─────────────────────────────── │
│  📁 Project: بناء جسر               │
│     Last: "تم التوظيف"              │
│     ─────────────────────────────── │
│  📁 Project: ترميم                  │
│     Last: "مرحبا بك"                │
│     🔴 1 unread                     │
└─────────────────────────────────────┘
```

### ProjectRoom View (عند فتح ProjectRoom):
```
┌─────────────────────────────────────┐
│  Project: تصميم منزل                │
├─────────────────────────────────────┤
│  💬 Chat with: أحمد (Engineer)      │
│     "المهندس أحمد قدم عرض..."      │
│     🔴 2 unread                     │
│     ─────────────────────────────── │
│  💬 Chat with: محمد (Engineer)      │
│     "تم رفض العرض"                  │
│     ─────────────────────────────── │
│  💬 Chat with: Client               │
│     "تم توظيف المهندس أحمد"         │
│     ─────────────────────────────── │
│  👥 Group Chat                      │
│     "مرحبا جميعا"                   │
│     🔴 1 unread                     │
└─────────────────────────────────────┘
```

---

## 🚀 البدء في التنفيذ

بعد الموافقة على هذه الخطة، سنبدأ بالترتيب التالي:
1. إنشاء Models
2. إنشاء Controllers
3. إنشاء Routes
4. إضافة Validation
5. إعداد Socket.io
6. الاختبار

---

**تاريخ الإنشاء**: $(date)
**الحالة**: قيد المراجعة

