const express = require('express')
const multer = require('multer');

const logger = require('../utils/logger')
const {authenticateRequest} = require('../middlewares/auth')
const {uploadMedia, getAllMedia} = require('../controllers/media')

const router = express.Router()

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {fileSize: 5 * 1024 * 1024}
}).single('file')

router.post('/upload', authenticateRequest, (req, res, next) => {
    upload(req, res, function(err){
        if(err instanceof multer.MulterError){
            logger.error('Multer error while uploading!')
            return res.status(400).json({
                success: false,
                message: 'Multer error while uploading!',
                error: err.message,
                stack: err.stack
            })
        }else if(err){
            logger.error('Unknown error occured while uploading!')
            return res.status(400).json({
                success: false,
                message: 'Unknown error occured while uploading!',
                error: err.message,
                stack: err.stack
            })
        }

        if(!req.file){
            return res.status(400).json({
                message: 'No file found!'
            })
        }
        next()
    })
}, uploadMedia)

router.get('/all', authenticateRequest, getAllMedia)

module.exports = router