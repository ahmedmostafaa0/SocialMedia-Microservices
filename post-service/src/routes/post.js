const express = require('express')
const {createPost, getAllPosts, getSinglePost, deletePost} = require('../controllers/post')
const {authenticateRequest} = require('../middlewares/auth')

const router = express.Router()
router.use(authenticateRequest)

router.post('/create', createPost)
router.get('/all', getAllPosts)
router.get('/:id', getSinglePost)
router.delete('/:id', deletePost)
module.exports = router