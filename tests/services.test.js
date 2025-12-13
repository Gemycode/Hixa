const request = require("supertest");
const app = require("../app");
const Content = require("../models/contentModel");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

describe("Services API Endpoints", () => {
  let adminToken;
  let testServiceId;
  let testDetailId;

  // Create admin user and get token before all tests
  beforeAll(async () => {
    // Create test admin user
    const admin = await User.create({
      email: "admin@test.com",
      password: "Test1234!",
      role: "admin",
      name: "Test Admin",
    });

    // Generate token
    adminToken = jwt.sign(
      { id: admin._id, role: admin.role },
      process.env.JWT_SECRET || "test-secret",
      { expiresIn: "1h" }
    );
  });

  // Clean up after each test
  afterEach(async () => {
    await Content.deleteMany({});
  });

  describe("POST /api/content/services/items - Add Service Item", () => {
    it("should add a new service item", async () => {
      const response = await request(app)
        .post("/api/content/services/items")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title_en: "Web Development",
          title_ar: "تطوير المواقع",
          description_en: "Professional web development services",
          description_ar: "خدمات تطوير مواقع احترافية",
          icon: "web-icon",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("تم إضافة الخدمة بنجاح");
      expect(response.body.data.title_en).toBe("Web Development");
      expect(response.body.data._id).toBeDefined();
      testServiceId = response.body.data._id;
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .post("/api/content/services/items")
        .send({
          title_en: "Test Service",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/content/services/items/:id - Get Service Item", () => {
    beforeEach(async () => {
      // Create a service item first
      const content = await Content.create({
        services: {
          items: [
            {
              _id: new mongoose.Types.ObjectId(),
              title_en: "Test Service",
              title_ar: "خدمة تجريبية",
              description_en: "Test description",
              description_ar: "وصف تجريبي",
              icon: "test-icon",
            },
          ],
        },
      });
      testServiceId = content.services.items[0]._id.toString();
    });

    it("should get a service item with its details", async () => {
      const response = await request(app)
        .get(`/api/content/services/items/${testServiceId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.service.title_en).toBe("Test Service");
      expect(response.body.data.details).toBeDefined();
      expect(Array.isArray(response.body.data.details)).toBe(true);
    });

    it("should return 404 for non-existent service", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .get(`/api/content/services/items/${fakeId}`);

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/content/services/items/:id - Update Service Item", () => {
    beforeEach(async () => {
      const content = await Content.create({
        services: {
          items: [
            {
              _id: new mongoose.Types.ObjectId(),
              title_en: "Original Title",
              title_ar: "العنوان الأصلي",
              description_en: "Original description",
              description_ar: "الوصف الأصلي",
              icon: "original-icon",
            },
          ],
        },
      });
      testServiceId = content.services.items[0]._id.toString();
    });

    it("should update a service item", async () => {
      const response = await request(app)
        .put(`/api/content/services/items/${testServiceId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title_en: "Updated Title",
          title_ar: "عنوان محدث",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("تم تحديث الخدمة بنجاح");
      expect(response.body.data.title_en).toBe("Updated Title");
      expect(response.body.data.title_ar).toBe("عنوان محدث");
    });

    it("should require authentication", async () => {
      const response = await request(app)
        .put(`/api/content/services/items/${testServiceId}`)
        .send({
          title_en: "Updated Title",
        });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/content/services/items/:serviceId/details - Add Service Detail", () => {
    beforeEach(async () => {
      const content = await Content.create({
        services: {
          items: [
            {
              _id: new mongoose.Types.ObjectId(),
              title_en: "Test Service",
              title_ar: "خدمة تجريبية",
            },
          ],
        },
      });
      testServiceId = content.services.items[0]._id.toString();
    });

    it("should add a new service detail", async () => {
      const response = await request(app)
        .post(`/api/content/services/items/${testServiceId}/details`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title_en: "Service Detail",
          title_ar: "تفاصيل الخدمة",
          details_en: "Detail description in English",
          details_ar: "وصف التفاصيل بالعربية",
          sectionKey: "section1",
          categoryKey: "general",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("تم إضافة تفاصيل الخدمة بنجاح");
      expect(response.body.data.title_en).toBe("Service Detail");
      expect(response.body.data.serviceItemId).toBe(testServiceId);
      testDetailId = response.body.data._id;
    });

    it("should return 404 for non-existent service", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .post(`/api/content/services/items/${fakeId}/details`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title_en: "Test Detail",
        });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /api/content/services/items/:id/details - Get Service Details", () => {
    beforeEach(async () => {
      const serviceId = new mongoose.Types.ObjectId();
      const detailId = new mongoose.Types.ObjectId();
      
      const content = await Content.create({
        services: {
          items: [
            {
              _id: serviceId,
              title_en: "Test Service",
            },
          ],
          details: [
            {
              _id: detailId,
              title_en: "Detail 1",
              serviceItemId: serviceId,
            },
            {
              _id: new mongoose.Types.ObjectId(),
              title_en: "Detail 2",
              serviceItemId: serviceId,
            },
          ],
        },
      });
      testServiceId = serviceId.toString();
    });

    it("should get all details for a service", async () => {
      const response = await request(app)
        .get(`/api/content/services/items/${testServiceId}/details`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.count).toBe(2);
      expect(response.body.data[0].serviceItemId.toString()).toBe(testServiceId);
    });
  });

  describe("PUT /api/content/services/items/:serviceId/details/:id - Update Service Detail", () => {
    beforeEach(async () => {
      const serviceId = new mongoose.Types.ObjectId();
      const detailId = new mongoose.Types.ObjectId();
      
      const content = await Content.create({
        services: {
          items: [
            {
              _id: serviceId,
              title_en: "Test Service",
            },
          ],
          details: [
            {
              _id: detailId,
              title_en: "Original Detail",
              title_ar: "تفصيل أصلي",
              serviceItemId: serviceId,
            },
          ],
        },
      });
      testServiceId = serviceId.toString();
      testDetailId = detailId.toString();
    });

    it("should update a service detail", async () => {
      const response = await request(app)
        .put(`/api/content/services/items/${testServiceId}/details/${testDetailId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title_en: "Updated Detail",
          title_ar: "تفصيل محدث",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("تم تحديث تفاصيل الخدمة بنجاح");
      expect(response.body.data.title_en).toBe("Updated Detail");
    });

    it("should return 400 if detail doesn't belong to service", async () => {
      const otherServiceId = new mongoose.Types.ObjectId();
      const response = await request(app)
        .put(`/api/content/services/items/${otherServiceId}/details/${testDetailId}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          title_en: "Updated Detail",
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("لا تنتمي");
    });
  });

  describe("DELETE /api/content/services/items/:serviceId/details/:id - Delete Service Detail", () => {
    beforeEach(async () => {
      const serviceId = new mongoose.Types.ObjectId();
      const detailId = new mongoose.Types.ObjectId();
      
      const content = await Content.create({
        services: {
          items: [
            {
              _id: serviceId,
              title_en: "Test Service",
            },
          ],
          details: [
            {
              _id: detailId,
              title_en: "Detail to Delete",
              serviceItemId: serviceId,
            },
          ],
        },
      });
      testServiceId = serviceId.toString();
      testDetailId = detailId.toString();
    });

    it("should delete a service detail", async () => {
      const response = await request(app)
        .delete(`/api/content/services/items/${testServiceId}/details/${testDetailId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("تم حذف تفاصيل الخدمة بنجاح");
    });
  });

  describe("DELETE /api/content/services/items/:id - Delete Service Item", () => {
    beforeEach(async () => {
      const serviceId = new mongoose.Types.ObjectId();
      const detailId = new mongoose.Types.ObjectId();
      
      const content = await Content.create({
        services: {
          items: [
            {
              _id: serviceId,
              title_en: "Service to Delete",
            },
          ],
          details: [
            {
              _id: detailId,
              title_en: "Related Detail",
              serviceItemId: serviceId,
            },
          ],
        },
      });
      testServiceId = serviceId.toString();
    });

    it("should delete service and its related details", async () => {
      const response = await request(app)
        .delete(`/api/content/services/items/${testServiceId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("تم حذف الخدمة بنجاح");
      expect(response.body.deletedDetailsCount).toBe(1);

      // Verify service is deleted
      const content = await Content.findOne();
      expect(content.services.items.length).toBe(0);
      expect(content.services.details.length).toBe(0);
    });
  });
});

