// src/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const UserSettings = require('../models/UserSettings');
const { readdirSync, mkdirSync } = require('fs');

module.exports = async (req, res, next) => {
    if (!req.cookies.token) return res.redirect("/login");

    let decoded;
    try {
        decoded = jwt.verify(req.cookies.token, process.env.JWTSECRET, { algorithm: process.env.JWTALGORITHM });
    } catch (e) {
        return res.redirect("/login");
    }

    let data = await User.findOne({
        where: { email: decoded.email, password: decoded.password },
    });
    if (!data) return res.redirect("/login");

    let UserSettingsS = await UserSettings.findOne({
        where: { email: decoded.email },
    });
    if (!UserSettingsS) return res.redirect("/login");

    let folder = req.cookies.folder || "/";

    const userFolder = readdirSync(`${process.env.USERS_DIR}`).some(
        (folder) => folder.toLowerCase() === decoded.email
    );

    if (!userFolder) {
        mkdirSync(`${process.env.USERS_DIR}/${decoded.email}`);
    }

    let userFolderPath = `${process.env.USERS_DIR}${decoded.email}/`;

    if (UserSettingsS.adminMode) {
        userFolderPath = `${process.env.USERS_DIR}`;
    }

    const folderPath = `${userFolderPath}${folder}`;

    try {
        await readdirSync(folderPath)
    } catch (e) {
        res.clearCookie('folder');
        return res.redirect("/?error=INVALID_FOLDER")
    }

    req.user = data;
    req.userSettings = UserSettingsS;
    req.folders = { userFolderPath, folderPath, folder };

    next();
};