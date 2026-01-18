const PartnerRequest = require("../models/partnerRequestModel");
const { uploadToCloudinary, deleteFromCloudinary } = require("../middleware/upload");

const sanitizePartnerRequest = (request) => {
  const r = request.toObject ? request.toObject() : request;
  return {
    id: r._id,
    companyName: r.companyName,
    businessType: r.businessType,
    description: r.description || "",
    phone: r.phone,
    email: r.email,
    city: r.city,
    logo: r.logo || "",
    portfolioImages: r.portfolioImages || [],
    adType: r.adType || "عادي",
    status: r.status,
    isActive: r.isActive,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
};

// Public: create a partner request (landing form)
exports.createPartnerRequest = async (req, res, next) => {
  try {
    console.log('📥 Partner Request Body:', req.body);
    const { companyName, businessType, description, phone, email, city, adType } = req.body;

    // Upload logo if provided
    let logoUrl = "";
    if (req.files && req.files.logo && req.files.logo.length > 0) {
      try {
        const logoFile = req.files.logo[0];
        logoUrl = await uploadToCloudinary(logoFile.buffer, "hixa/partners/logos");
        console.log('✅ Logo uploaded successfully:', logoUrl);
      } catch (uploadError) {
        console.error('❌ Error uploading logo:', uploadError);
        return res.status(400).json({ 
          message: "فشل رفع شعار الشركة", 
          error: uploadError.message 
        });
      }
    }

    // Upload portfolio images if provided
    let portfolioImageUrls = [];
    if (req.files) {
      try {
        // Check for portfolioImages field (from uploadFields)
        let portfolioFiles = [];
        if (req.files.portfolioImages && Array.isArray(req.files.portfolioImages)) {
          portfolioFiles = req.files.portfolioImages;
        } else if (req.files.portfolioImage && Array.isArray(req.files.portfolioImage)) {
          portfolioFiles = req.files.portfolioImage;
        }
        
        // Limit to 2 images
        const filesToUpload = portfolioFiles.slice(0, 2);
        
        for (const file of filesToUpload) {
          const imageUrl = await uploadToCloudinary(file.buffer, "hixa/partners/portfolio");
          portfolioImageUrls.push(imageUrl);
          console.log('✅ Portfolio image uploaded successfully:', imageUrl);
        }
      } catch (uploadError) {
        console.error('❌ Error uploading portfolio images:', uploadError);
        // Continue even if portfolio upload fails
      }
    }
    
    console.log('📸 Files received:', {
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : [],
      logoCount: req.files?.logo?.length || 0,
      portfolioCount: req.files?.portfolioImages?.length || req.files?.portfolioImage?.length || 0
    });

    const requestData = {
      companyName: companyName?.trim() || "",
      businessType: businessType?.trim() || "",
      description: description?.trim() || "",
      phone: phone?.trim() || "",
      email: email?.trim() || "",
      city: city?.trim() || "",
      logo: logoUrl,
      portfolioImages: portfolioImageUrls,
      adType: adType || "عادي",
    };

    console.log('💾 Creating partner request with data:', requestData);

    const request = await PartnerRequest.create(requestData);

    console.log('✅ Partner request created successfully:', request._id);

    res.status(201).json({
      message: "تم إرسال طلب الشراكة بنجاح",
      data: sanitizePartnerRequest(request),
    });
  } catch (error) {
    console.error('❌ Error creating partner request:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    next(error);
  }
};

// Admin: list partner requests with filters + pagination
exports.getPartnerRequests = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const { status, search, email, businessType } = req.query;

    const filters = { isActive: true };
    if (status) filters.status = status;
    if (email) filters.email = new RegExp(email, "i");
    if (businessType) filters.businessType = new RegExp(businessType, "i");
    if (search) {
      const regex = new RegExp(search, "i");
      filters.$or = [
        { companyName: regex },
        { email: regex },
        { phone: regex },
        { city: regex },
        { description: regex },
        { businessType: regex },
      ];
    }

    const [requests, total] = await Promise.all([
      PartnerRequest.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PartnerRequest.countDocuments(filters),
    ]);

    res.json({
      data: requests.map(sanitizePartnerRequest),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Admin: get single partner request
exports.getPartnerRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const request = await PartnerRequest.findById(id);

    if (!request || !request.isActive) {
      return res.status(404).json({ message: "طلب الشراكة غير موجود" });
    }

    res.json({
      data: sanitizePartnerRequest(request),
    });
  } catch (error) {
    next(error);
  }
};

// Admin: update status/fields
exports.updatePartnerRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      companyName, 
      businessType, 
      description, 
      phone, 
      email, 
      city, 
      adType, 
      status 
    } = req.body;
    
    const request = await PartnerRequest.findById(id);

    if (!request || !request.isActive) {
      return res.status(404).json({ message: "طلب الشراكة غير موجود" });
    }

    // Update logo if new file is provided
    if (req.files && req.files.logo && req.files.logo.length > 0) {
      try {
        // Delete old logo if exists
        if (request.logo && request.logo.includes("cloudinary.com")) {
          await deleteFromCloudinary(request.logo);
        }
        // Upload new logo
        const logoFile = req.files.logo[0];
        request.logo = await uploadToCloudinary(logoFile.buffer, "hixa/partners/logos");
      } catch (uploadError) {
        console.error('❌ Error uploading logo:', uploadError);
        return res.status(400).json({ 
          message: "فشل رفع شعار الشركة", 
          error: uploadError.message 
        });
      }
    }

    // Update portfolio images if new files are provided
    if (req.files) {
      try {
        // Check for portfolioImages field (from uploadFields)
        let portfolioFiles = [];
        if (req.files.portfolioImages && Array.isArray(req.files.portfolioImages)) {
          portfolioFiles = req.files.portfolioImages;
        } else if (req.files.portfolioImage && Array.isArray(req.files.portfolioImage)) {
          portfolioFiles = req.files.portfolioImage;
        }
        
        if (portfolioFiles.length > 0) {
          // Delete old portfolio images
          if (request.portfolioImages && request.portfolioImages.length > 0) {
            for (const oldImage of request.portfolioImages) {
              if (oldImage && oldImage.includes("cloudinary.com")) {
                await deleteFromCloudinary(oldImage);
              }
            }
          }
          
          // Upload new portfolio images (max 2)
          const filesToUpload = portfolioFiles.slice(0, 2);
          const newPortfolioImages = [];
          for (const file of filesToUpload) {
            const imageUrl = await uploadToCloudinary(file.buffer, "hixa/partners/portfolio");
            newPortfolioImages.push(imageUrl);
          }
          request.portfolioImages = newPortfolioImages;
        }
      } catch (uploadError) {
        console.error('❌ Error uploading portfolio images:', uploadError);
        // Continue even if portfolio upload fails
      }
    }

    // Update other fields
    if (companyName !== undefined) request.companyName = companyName;
    if (businessType !== undefined) request.businessType = businessType;
    if (description !== undefined) request.description = description;
    if (phone !== undefined) request.phone = phone;
    if (email !== undefined) request.email = email;
    if (city !== undefined) request.city = city;
    if (adType !== undefined) request.adType = adType;
    if (status !== undefined) request.status = status;

    await request.save();

    res.json({
      message: "تم تحديث طلب الشراكة بنجاح",
      data: sanitizePartnerRequest(request),
    });
  } catch (error) {
    next(error);
  }
};

// Admin: soft delete
exports.deletePartnerRequest = async (req, res, next) => {
  try {
    const request = await PartnerRequest.findById(req.params.id);
    if (!request || !request.isActive) {
      return res.status(404).json({ message: "طلب الشراكة غير موجود" });
    }

    // Delete images from Cloudinary
    if (request.logo && request.logo.includes("cloudinary.com")) {
      await deleteFromCloudinary(request.logo);
    }
    if (request.portfolioImages && request.portfolioImages.length > 0) {
      for (const image of request.portfolioImages) {
        if (image && image.includes("cloudinary.com")) {
          await deleteFromCloudinary(image);
        }
      }
    }

    request.isActive = false;
    await request.save();

    res.json({ message: "تم حذف طلب الشراكة بنجاح" });
  } catch (error) {
    next(error);
  }
};
