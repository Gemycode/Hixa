const ServiceOrder = require("../models/serviceOrderModel");
const { uploadToCloudinary } = require("../middleware/upload");

const sanitizeServiceOrder = (order) => {
  const o = order.toObject ? order.toObject() : order;
  return {
    id: o._id,
    serviceId: o.serviceId,
    serviceType: o.serviceType,
    title: o.title,
    description: o.description,
    orderDetails: o.orderDetails,
    email: o.email,
    image: o.image,
    status: o.status,
    isActive: o.isActive,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

// Public: create a service order (landing modal form)
exports.createServiceOrder = async (req, res, next) => {
  try {
    const { serviceId, serviceType, title, description, orderDetails, email } = req.body;

    // If serviceId is not provided, try to find it from serviceType
    let finalServiceId = serviceId;
    if (!finalServiceId && serviceType) {
      // Try to find service by serviceType (fallback)
      const Content = require("../models/contentModel");
      const content = await Content.findOne();
      if (content && content.services && content.services.items) {
        const service = content.services.items.find(
          (item) =>
            item.title_en?.toLowerCase().includes(serviceType.toLowerCase()) ||
            item.title_ar?.toLowerCase().includes(serviceType.toLowerCase())
        );
        if (service && service._id) {
          finalServiceId = service._id.toString();
        }
      }
    }

    // If still no serviceId, use serviceType as fallback
    if (!finalServiceId) {
      finalServiceId = serviceType || "unknown";
    }

    let imagePayload = undefined;
    if (req.file) {
      const url = await uploadToCloudinary(req.file.buffer, "hixa/service-orders");
      imagePayload = { url };
    }

    const order = await ServiceOrder.create({
      serviceId: finalServiceId,
      serviceType,
      title,
      description,
      orderDetails,
      email,
      image: imagePayload,
    });

    res.status(201).json({
      message: "تم إرسال طلب الخدمة بنجاح",
      data: sanitizeServiceOrder(order),
    });
  } catch (error) {
    next(error);
  }
};

// Admin: list service orders with filters + pagination
exports.getServiceOrders = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const { status, serviceId, serviceType, search, email } = req.query;

    const filters = { isActive: true };
    if (status) filters.status = status;
    if (serviceId) filters.serviceId = serviceId;
    if (serviceType) filters.serviceType = serviceType;
    if (email) filters.email = new RegExp(email, "i");
    if (search) {
      const regex = new RegExp(search, "i");
      filters.$or = [{ title: regex }, { description: regex }, { orderDetails: regex }];
    }

    const [orders, total] = await Promise.all([
      ServiceOrder.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ServiceOrder.countDocuments(filters),
    ]);

    res.json({
      data: orders.map(sanitizeServiceOrder),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: get one service order
exports.getServiceOrderById = async (req, res, next) => {
  try {
    const order = await ServiceOrder.findOne({ _id: req.params.id, isActive: true });
    if (!order) {
      return res.status(404).json({ message: "طلب الخدمة غير موجود" });
    }
    res.json({ data: sanitizeServiceOrder(order) });
  } catch (error) {
    next(error);
  }
};

// Admin: update status/fields
exports.updateServiceOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { serviceId, serviceType, title, description, orderDetails, email, status } = req.body;
    const order = await ServiceOrder.findById(id);

    if (!order || !order.isActive) {
      return res.status(404).json({ message: "طلب الخدمة غير موجود" });
    }

    if (serviceId !== undefined) order.serviceId = serviceId;
    if (serviceType !== undefined) order.serviceType = serviceType;
    if (title !== undefined) order.title = title;
    if (description !== undefined) order.description = description;
    if (orderDetails !== undefined) order.orderDetails = orderDetails;
    if (email !== undefined) order.email = email;
    if (status !== undefined) order.status = status;

    if (req.file) {
      const url = await uploadToCloudinary(req.file.buffer, "hixa/service-orders");
      order.image = { url };
    }

    await order.save();

    res.json({
      message: "تم تحديث طلب الخدمة بنجاح",
      data: sanitizeServiceOrder(order),
    });
  } catch (error) {
    next(error);
  }
};

// Admin: soft delete
exports.deleteServiceOrder = async (req, res, next) => {
  try {
    const order = await ServiceOrder.findById(req.params.id);
    if (!order || !order.isActive) {
      return res.status(404).json({ message: "طلب الخدمة غير موجود" });
    }

    order.isActive = false;
    await order.save();

    res.json({ message: "تم حذف طلب الخدمة بنجاح" });
  } catch (error) {
    next(error);
  }
};

