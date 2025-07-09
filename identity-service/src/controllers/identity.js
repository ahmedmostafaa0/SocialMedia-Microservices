const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { validateRegister, validateLogin } = require("../utils/validation");
const logger = require("../utils/logger");
const generateToken = require("../utils/generateToken");

// register
const register = async (req, res) => {
  logger.info("Registration endpoint hit....");
  try {
    const { error } = validateRegister(req.body);
    if (error) {
      logger.warn("Validation Error", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }

    const { username, email, password } = req.body;
    let user = await User.findOne({ $or: [{ email }, { username }] });
    if (user) {
      logger.warn("User already exists!");
      return res
        .status(400)
        .json({ success: false, message: "User already exists!" });
    }
    user = new User({ username, email, password });
    await user.save();
    logger.warn("User saved successfully", user._id);

    const { accessToken, refreshToken } = await generateToken(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// login
const login = async (req, res) => {
  logger.info("Login endpoint hit...");
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res
        .status(400)
        .json({ success: false, message: error.details[0].message });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      logger.warn("Invalid user!");
      return res.status(400).json({ success: false, message: "Invalid user!" });
    }
    const isValidPassword = await user.comparedPassword(password);
    if (!isValidPassword) {
      logger.warn("Invalid password!");
      return res
        .status(400)
        .json({ success: false, message: "Invalid password!" });
    }
    const { accessToken, refreshToken } = await generateToken(user);
    res.status(200).json({
      success: true,
      message: "user Login successfully",
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (error) {
    logger.error("Login error occured", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// refreshtoken
const refreshTokenUser = async (req, res) => {
  logger.info("Refresh Token endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res
        .status(400)
        .json({ success: false, message: "Refresh token missing" });
    }
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired Token");
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired Token" });
    }
    const user = await User.findById(storedToken.user);
    if (!user) {
      logger.warn("User not found!");
      return res
        .status(400)
        .json({ success: false, message: "User not found!" });
    }
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateToken(user);

    await RefreshToken.deleteOne({ _id: storedToken._id });
    res.json({
      success: true,
      newAccessToken,
      newRefreshToken,
    });
  } catch (error) {
    logger.error("Refresh Token error occured", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// logout
const logout = async (req, res) => {
  logger.info("Logout endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res
        .status(400)
        .json({ success: false, message: "Refresh token missing" });
    }
    await RefreshToken.deleteOne({token: refreshToken})
    logger.info('Refresh token deleted to logout')
    res.json({
        success: true,
        message: 'Logged out successfully'
    })
  } catch (error) {
    logger.error("Logout error occured", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

module.exports = { register, login, refreshTokenUser, logout };
