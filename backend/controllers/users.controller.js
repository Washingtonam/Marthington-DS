// backend/controllers/users.controller.js
const User = require('../models/User.model');
const ServiceRequest = require('../models/ServiceRequest.model');
const CacRequest = require('../models/CacRequest.model');

// Example: Logic from modules/users/users.routes.js
exports.getAllUsers = async (req, res) => {
  // ...existing logic from users.routes.js...
};

exports.createUser = async (req, res) => {
  // ...existing logic from users.routes.js...
};

exports.getUserRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const statusParam = req.query.status?.trim().toLowerCase();
    const typeParam = req.query.type?.trim();

    const serviceQuery = { userId };
    const cacQuery = { userId };

    if (statusParam) {
      if (statusParam === 'approved') {
        serviceQuery.status = { $in: ['completed', 'success', 'successful'] };
        cacQuery.status = { $in: ['completed', 'success', 'successful'] };
      } else if (statusParam === 'rejected') {
        serviceQuery.status = { $in: ['rejected', 'failed'] };
        cacQuery.status = { $in: ['rejected', 'failed'] };
      } else {
        serviceQuery.status = statusParam;
        cacQuery.status = statusParam;
      }
    }

    if (typeParam) {
      const normalizedType = typeParam.toLowerCase();
      if (['nimc', 'cac', 'nmt'].includes(normalizedType)) {
        serviceQuery.serviceCategory = new RegExp(`^${typeParam}$`, 'i');
        cacQuery.serviceCategory = new RegExp(`^${typeParam}$`, 'i');
      } else {
        serviceQuery.type = new RegExp(`^${typeParam}$`, 'i');
        cacQuery.serviceType = new RegExp(`^${typeParam}$`, 'i');
      }
    }

    let searchRegex;
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchRegex = new RegExp(escapedSearch, 'i');
      serviceQuery.$or = [
        { nin: searchRegex },
        { _id: searchRegex },
        { service: searchRegex },
        { type: searchRegex }
      ];
      cacQuery.$or = [
        { _id: searchRegex },
        { businessName1: searchRegex },
        { businessName2: searchRegex },
        { companyEmail: searchRegex }
      ];
    }

    const take = page * limit;
    const [services, cacs, serviceCount, cacCount] = await Promise.all([
      ServiceRequest.find(serviceQuery).sort({ createdAt: -1 }).limit(take).lean(),
      CacRequest.find(cacQuery).sort({ createdAt: -1 }).limit(take).lean(),
      ServiceRequest.countDocuments(serviceQuery),
      CacRequest.countDocuments(cacQuery)
    ]);

    const normalizedServices = services.map((s) => ({
      ...s,
      pipelineSource: 'service',
      serviceCategory: s.serviceCategory || 'NIMC'
    }));

    const normalizedCacs = cacs.map((c) => ({
      ...c,
      pipelineSource: 'cac',
      type: c.serviceType || 'cac',
      serviceCategory: c.serviceCategory || 'CAC'
    }));

    const combinedHistory = [...normalizedServices, ...normalizedCacs].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const pagedData = combinedHistory.slice(skip, skip + limit);
    const totalCount = serviceCount + cacCount;

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      data: pagedData
    });
  } catch (error) {
    console.error('🔥 USER REQUESTS ERROR:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to load user requests.' });
  }
};
