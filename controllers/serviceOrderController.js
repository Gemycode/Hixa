const ServiceOrder = require("../models/serviceOrderModel");

const sanitizeServiceOrder = (order) => {
  const o = order.toObject ? order.toObject() : order;
  return {
    id: o._id,
    orderDetails: o.orderDetails,
    email: o.email,
    phone: o.phone,
    serviceId: o.serviceId || null,
    serviceTitle: o.serviceTitle || null,
    status: o.status,
    isActive: o.isActive,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
};

// Public: create a service order (landing modal form) - minimal fields
exports.createServiceOrder = async (req, res, next) => {
  try {
    console.log('📥 Service Order Request Body:', req.body);
    const { email, phone, orderDetails, serviceId, title } = req.body;

    const orderData = {
      email,
      phone,
      orderDetails,
      serviceId: serviceId || null,
      serviceTitle: title || null,
    };

    console.log('💾 Creating order with data:', orderData);

    const order = await ServiceOrder.create(orderData);

    console.log('✅ Order created successfully:', order._id);

    res.status(201).json({
      message: "تم إرسال طلب الخدمة بنجاح",
      data: sanitizeServiceOrder(order),
    });
  } catch (error) {
    console.error('❌ Error creating service order:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    next(error);
  }
};

// Admin: list service orders with filters + pagination
exports.getServiceOrders = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const { status, search, email } = req.query;

    const filters = { isActive: true };
    if (status) filters.status = status;
    if (email) filters.email = new RegExp(email, "i");
    if (search) {
      const regex = new RegExp(search, "i");
      filters.$or = [
        { orderDetails: regex },
        { email: regex },
        { phone: regex },
        { serviceTitle: regex },
      ];
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
    const { orderDetails, email, phone, status, serviceId, serviceTitle } = req.body;
    const order = await ServiceOrder.findById(id);

    if (!order || !order.isActive) {
      return res.status(404).json({ message: "طلب الخدمة غير موجود" });
    }

    if (orderDetails !== undefined) order.orderDetails = orderDetails;
    if (email !== undefined) order.email = email;
    if (phone !== undefined) order.phone = phone;
    if (status !== undefined) order.status = status;
    if (serviceId !== undefined) order.serviceId = serviceId;
    if (serviceTitle !== undefined) order.serviceTitle = serviceTitle;

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

