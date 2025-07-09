const invalidatePostCache = async (req, postId) => {
    const singlePostKey = `post:${postId}`
    await req.redisClient.del(singlePostKey)

    const postListKeys = await req.redisClient.keys('posts:*')
    if(postListKeys.length > 0){ 
        await req.redisClient.del(postListKeys)
    }
}

module.exports = {invalidatePostCache}