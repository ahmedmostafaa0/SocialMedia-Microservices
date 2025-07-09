const logger = require("../../../post-service/src/utils/logger")


const authenticateRequest = (req, res, next) => {
    const userId = req.headers['x-user-id']
    if(!userId){
        logger.warn('Access attempt without user Id')
        return res.status(429).json({success: false, message: 'Authentication required!'})
    }
    req.user = {userId}
    next()
}

module.exports = {authenticateRequest}