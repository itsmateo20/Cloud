const User = require("../models/User.js");
const UserSettings = require("../models/UserSettings.js");
const jwt = require("jsonwebtoken");
const { readdirSync, mkdirSync, existsSync } = require("fs");
const { resolve } = require("path");
const sharp = require("sharp");

module.exports = {
    name: "image",
    url: "/image",
    run: async (req, res) => {
        if (!req.cookies.token) return res.redirect("/login");
        let decoded;
        try {
            decoded = jwt.verify(req.cookies.token, process.env.JWTSECRET, { algorithm: process.env.JWTALGORITHM });
        } catch (e) { }
        if (!decoded) return res.redirect("/login");

        let data = await User.findOne({
            where: { email: decoded.email, password: decoded.password },
        });
        if (!data) return res.redirect("/login");
        let UserSettingsS = await UserSettings.findOne({
            where: { email: decoded.email },
        });
        if (!UserSettingsS) return res.redirect("/login");

        if (!req.query.path) return res.redirect("/");
        req.query.path = req.query.path.replace(/"/g, "").replace(/'/g, "")

        const userFolder = readdirSync(`${process.env.USERS_DIR}`).some(
            (folder) => folder.toLowerCase() === decoded.email
        );

        if (!userFolder) {
            mkdirSync(`${process.env.USERS_DIR}${decoded.email}`);
        }

        let userFolderPath = `${process.env.USERS_DIR}${decoded.email}/`;

        if (UserSettingsS.adminMode) {
            userFolderPath = `${process.env.USERS_DIR}`;
        }

        const imagePath = `${userFolderPath}${req.query.path}`;
        const getImage = existsSync(imagePath);

        if (!getImage) return res.redirect("/?error=FILE_DOESNT_EXIST");
        const image = resolve(imagePath);

        if (req.query.preview && req.query.preview == "true") {
            const imageInfo = await sharp(image).metadata();
            const originalWidth = imageInfo.width;
            const originalHeight = imageInfo.height;
            const resizedWidth = Math.round(originalWidth / 4);
            const resizedHeight = Math.round(originalHeight / 4);

            const resizedImage = await sharp(image).resize(resizedWidth, resizedHeight).toBuffer();
            res.type("image/png").send(resizedImage);
        } else res.sendFile(image);
    },
};
