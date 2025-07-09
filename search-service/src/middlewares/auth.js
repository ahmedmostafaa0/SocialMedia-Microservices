const authenticateRequest = (req, res, next) => {
  const userId = req.headers["x-user-id"];
  if (!userId) {
    logger.warn("Access attemped without user ID!");
    return res
      .status(401)
      .json({
        success: false,
        message: "Authentication required! please loginn to continue",
      });
  }
  req.user = { userId };
  next()
};

module.exports = {authenticateRequest}
