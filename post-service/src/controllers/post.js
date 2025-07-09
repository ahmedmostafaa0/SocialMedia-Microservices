const logger = require("../utils/logger");
const Post = require("../models/Post");
const { validateCreatePost } = require("../utils/validation");
const { publishEvent } = require("../utils/rabbitmq");
const {invalidatePostCache} = require('../utils/invalidateCache')

const createPost = async (req, res) => {
  logger.info("Create post endpoint hit...");
  try {
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn(
        "Validation error at creating post!",
        error.details[0].message
      );
      return res
        .status(400)
        .json({
          success: false,
          message: "Validation error!",
          error: error.details[0].message,
        });
    }
    const { content, mediaIds } = req.body;
    const post = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });
    await post.save();
    await publishEvent('post.created', {
      postId: post._id.toString(),
      userId: post.user.toString(),
      content: post.content,
      createdAt: post.createdAt
    })
    await invalidatePostCache(req, post._id.toString())
    logger.info("Post created successfully", post);
    res
      .status(201)
      .json({ success: true, message: "Post created successfully" });
  } catch (error) {
    logger.error("Create post error occurred!");
    return res
      .status(500)
      .json({ success: false, message: "Internal server error!" });
  }
};

const getAllPosts = async (req, res) => {
  logger.info("Get all posts endpoint hit...");
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey);

    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }

    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalPosts = await Post.countDocuments()

    const result = {
        posts,
        currentPage: page,
        totalPosts,
        totalPages: Math.ceil(totalPosts / limit)
    }

    await req.redisClient.setex(cacheKey, 5 * 60, JSON.stringify(result))
    res.json({success: true, result})
  } catch (error) {
    logger.error("Get all posts error occurred!");
    return res
      .status(500)
      .json({ success: false, message: "Internal server error!" });
  }
};

const getSinglePost = async (req, res) => {
  logger.info("Get single post endpoint hit...");
  try {
    const postId = req.params.id
    const cacheKey = `post:${postId}`
    const cachedPost = await req.redisClient.get(cacheKey)

    if(cachedPost){
        return res.json(JSON.parse(cachedPost))
    }

    const post = await Post.findById(postId)
    if(!post) {
        return res.status(404).json({success: false, message: 'Post not found!'})
    }
    await req.redisClient.setex(cacheKey, 60 * 60, JSON.stringify(post))
    res.json({success: true, post})
    
  } catch (error) {
    logger.error("Get single post error occurred!");
    return res
      .status(500)
      .json({ success: false, message: "Internal server error!" });
  }
};

const deletePost = async (req, res) => {
  logger.info("Delete post endpoint hit...");
  try {
    const post = await Post.findByIdAndDelete({
        _id: req.params.id,
        user: req.user.userId
    })
    if(!post){
        return res.status(404).json({success: false, message: 'Post not found!'})
    }
    await publishEvent('post.deleted', {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    })
    await invalidatePostCache(req, req.params.id)

    res.json({success: true, message: 'Post deleted successfully!'})
  } catch (error) {
    logger.error("Delete post error occurred!");
    return res
      .status(500)
      .json({ success: false, message: "Internal server error!" });
  }
};

module.exports = { createPost, getAllPosts, getSinglePost, deletePost };
