const express = require('express');
const { register, login, logout, refreshTokenUser } = require('../controllers/identity');

const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/refresh-token', refreshTokenUser)
router.post('/logout', logout)

module.exports = router