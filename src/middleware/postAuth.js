// src/middleware/postAuth.js

const User = require("../models/User.js")
const UserSettings = require("../models/UserSettings.js")
const jwt = require("jsonwebtoken");
const { readdirSync } = require("fs");

module.exports = async (req, res, next) => {
    if (!req.cookies.token) return res.status(500).json({ success: false, message: "FAILED_AUTHENTICATION" });
    let decoded;
    try {
        decoded = jwt.verify(req.cookies.token, process.env.JWTSECRET, { algorithm: process.env.JWTALGORITHM });
    } catch (e) { }
    if (!decoded) return res.status(500).json({ success: false, message: "FAILED_AUTHENTICATION" });

    const data = await User.findOne({
        where: { email: decoded.email, password: decoded.password },
    });
    if (!data) return res.status(500).json({ success: false, message: "FAILED_AUTHENTICATION" });
    const UserSettingsS = await UserSettings.findOne({
        where: { email: decoded.email },
    });
    if (!UserSettingsS) return res.status(500).json({ success: false, message: "FAILED_AUTHENTICATION" });

    const folder = req.cookies.folder || "";


    const userFolder = readdirSync(`${process.env.USERS_DIR}`).some(
        (userFolder) => userFolder.toLowerCase() === decoded.email
    );

    if (!userFolder) return res.status(500).json({ success: false, message: "INVALID_FOLDER" });
    const userFolderPath = `${process.env.USERS_DIR}${decoded.email}`;
    const folderPath = `${userFolderPath}${folder}`;

    req.user = data;
    req.userSettings = UserSettingsS;
    req.folders = { userFolderPath, folderPath, folder };

    next();
};