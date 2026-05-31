// backend/routes/users.routes.js
const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

// Example routes (match your old modules/users/users.routes.js)
router.get('/', usersController.getAllUsers);
router.post('/', usersController.createUser);

module.exports = router;
