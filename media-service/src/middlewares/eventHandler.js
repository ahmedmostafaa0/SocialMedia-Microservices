const Media = require("../models/Media")
const { deleteMediaFromCloudinary } = require("../utils/cloudinary")
const logger = require('../utils/logger')

const handlePostDeleted = async (event) => {
    const {mediaIds, postId} = event
    try {
        const mediaToDelete = await Media.find({_id: {$in: mediaIds}})
        for (const media of mediaToDelete){
            await deleteMediaFromCloudinary(media.publicId)
            await Media.findByIdAndDelete(media._id)
            logger.info(`Deleted media: ${media._id} associated with this deleted post: ${postId}`)
        }
        logger.info(`Proceed deleting media for this post: ${postId}`)
    } catch (error) {
        logger.error('Error occured while delete media: ', error)
        throw error
    }
}

module.exports = {handlePostDeleted}