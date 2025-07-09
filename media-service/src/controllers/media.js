const logger = require('../utils/logger')
const Media = require('../models/Media')
const {uploadMediaToCloudinary} = require('../utils/cloudinary')

const uploadMedia = async (req, res) => {
    logger.info('starting media upload...')
    try {
        if(!req.file){
            logger.error('No file found. Please add a file and try again!')
            return res.status(400).json({success: false, message: 'No file found. Please add a file and try again!'})
        }
        const {originalname, mimetype} = req.file
        const userId = req.user.userId

        logger.info(`File details: name=${originalname}, type=${mimetype}`)
        logger.info('Uploading to cloudinary starting...')

        const cloudinary = await uploadMediaToCloudinary(req.file)
        logger.info(`Cloudinary upload successfully. Public Id: -${cloudinary.public_id}`)

        const media = new Media({
            originalName: originalname,
            mimeType: mimetype,
            userId,
            publicId: cloudinary.public_id,
            url: cloudinary.secure_url
        })
        await media.save()
        res.status(201).json({
            success: true,
            message: 'Media uploaded successfully',
            mediaId: media._id,
            url: media.url
        })
        
    } catch (error) {
        logger.error('Error while uploading media:', error)
        res.status(500).json({success: false, message: 'Internal server error!'})
    }
}

const getAllMedia = async (req, res) => {
    try {
        const medias = await Media.find({})
        res.json(medias)
    } catch (error) {
        logger.error('Error while deleting media:', error)
        res.status(500).json({success: false, message: 'Internal server error!'})
    }
}

module.exports = {uploadMedia, getAllMedia}