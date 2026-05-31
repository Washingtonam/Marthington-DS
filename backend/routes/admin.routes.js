const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');

// You must add your authentication middleware (isAdmin, isSuperAdmin) in your main app or here if needed

router.get('/requests', adminController.getRequests);
router.get('/stats', adminController.getStats);
router.get('/nimc-requests', adminController.getNimcRequests);
router.get('/cac-requests', adminController.getCacRequests);
router.put('/update-status/:targetModule/:id', adminController.updateStatus);
router.get('/payments', adminController.getPayments);
router.post('/payments/:id/approve', adminController.approvePayment);
router.post('/payments/:id/reject', adminController.rejectPayment);
router.get('/users', adminController.getAllAdminUsers);
router.get('/transactions', adminController.getTransactions);
router.get('/audit-logs', adminController.getAuditLogs);
router.put('/user/:id/make-admin', adminController.makeAdmin);
router.put('/user/:id/remove-admin', adminController.removeAdmin);
router.put('/user/:id/suspend', adminController.suspendUser);
router.put('/user/:id/activate', adminController.activateUser);
router.delete('/user/:id', adminController.deleteUser);
router.post('/user/:id/units', adminController.updateUnits);
router.put('/pricing', adminController.updatePricing);

module.exports = router;
