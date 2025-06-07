const User = require("../models/User.js");
const UserSettings = require("../models/UserSettings.js");
const jwt = require("jsonwebtoken");
const { readdirSync, mkdirSync, existsSync } = require("fs");
const { resolve, basename } = require("path");

const sharp = require("sharp");
const ffmpeg = require('fluent-ffmpeg');

module.exports = {
    name: "video",
    url: "/video",
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

        const videoPath = `${userFolderPath}${req.query.path}`;
        const getVideo = existsSync(videoPath);

        if (!getVideo) return res.redirect("/?error=FILE_DOESNT_EXIST");
        const video = resolve(videoPath);


        if (req.query.preview && req.query.preview == "true") {
            let filename = basename(video);
            const tempFolder = existsSync(__dirname + `/../../temp/`);
            if (!tempFolder) mkdirSync(__dirname + `/../../temp`);
            const tempUserFolder = existsSync(__dirname + `/../../temp/${decoded.email}/`);
            if (!tempUserFolder) mkdirSync(__dirname + `/../../temp/${decoded.email}`);
            const tempPath = __dirname + `/../../temp/${decoded.email}/`;
            const tempImagePath = resolve(tempPath + filename + '.png')
            if (!existsSync(tempImagePath)) await ffmpeg(video).takeScreenshots({ count: 1, timemarks: ['0'], filename: filename + '.png' }, tempPath)
            while (!existsSync(tempImagePath)) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            if (existsSync(tempImagePath)) {
                const imageInfo = await sharp(tempImagePath).metadata();
                const originalWidth = imageInfo.width;
                const originalHeight = imageInfo.height;
                const resizedWidth = Math.round(originalWidth / 4);
                const resizedHeight = Math.round(originalHeight / 4);

                const resizedImage = await sharp(tempImagePath).resize(resizedWidth, resizedHeight).toBuffer();
                res.type("image/png").send(resizedImage);
            }
        } else res.sendFile(video);
    },
};