const logger = require("../utils/logger");
const Search = require("../models/Search");

const searchPost = async (req, res) => {
  logger.info('Searching post endpoing hit...')
  try {
    const query = req.query.query;
    const search = await Search.find(
      {
        $text: { $search: query },
      },
      { score: { $meta: "textScore" } }
    ).sort({score: {$meta: 'textScore'}}).limit(10)

    res.json(search)
  } catch (error) {
    logger.error("Error while searching post: ", error);
    return res.status(500).json({
      success: false,
      message: "Error while searching post!",
    });
  }
};

module.exports = {searchPost}
