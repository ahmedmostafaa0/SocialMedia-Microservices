const express = require('express')
const {searchPost} = require('../controllers/search')
const {authenticateRequest} = require('../middlewares/auth')

const router = express.Router()

router.use(authenticateRequest)

router.get('/posts', searchPost)

module.exports = router