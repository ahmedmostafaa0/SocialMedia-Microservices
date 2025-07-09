const Search = require("../models/Search");
const logger = require("../utils/logger");

const handlePostCreated = async (event) => {
  const { userId, postId, createdAt, content } = event;
  try {
    const search = new Search({
      userId,
      postId,
      content,
      createdAt,
    });
    await search.save();

    logger.info(`Search post created: ${postId}, ${search._id}`);
  } catch (error) {
    logger.error("Error occured while create post event!", error);
    throw error;
  }
};
const handlePostDeleted = async (event) => {
  const { postId } = event;
  try {
    await Search.findByIdAndDelete({postId});
    logger.info(`Search post deleted: ${postId}`)
  } catch (error) {
    logger.error("Error occured while delete post event: ", error);
    throw error;
  }
};

module.exports = { handlePostCreated, handlePostDeleted };
