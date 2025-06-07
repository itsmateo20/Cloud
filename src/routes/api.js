const User = require("../models/User.js")
const UserSettings = require("../models/UserSettings.js")
const Whitelisted = require("../models/Whitelisted.js")
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { readdirSync } = require("fs");

module.exports = {
    name: "Api",
    url: "/api/:id",
    run: async (req, res) => {
        if (req.params.id == "env") {
            if (req.query.action == "get") {
                const { DEFAULT_LANGUAGE } = process.env;
                return res.status(200).json({ success: true, env: { DEFAULT_LANGUAGE } });
            } else return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
        } else await ApiFunction(req, res, await Auth(req, res));
    },
    run2: async (req, res) => {
        if (req.params.id == "env") {
            if (req.query.action == "get") {
                const { DEFAULT_LANGUAGE } = process.env;
                return res.status(200).json({ success: true, env: { DEFAULT_LANGUAGE } });
            } else return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
        } else await ApiFunction(req, res, await Auth(req, res));
    }
}

async function Auth(req, res) {
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

    return { decoded, data, UserSettingsS, userFolder, userFolderPath, folderPath }
}

async function ApiFunction(req, res, { decoded, data, UserSettingsS, userFolder, userFolderPath, folderPath }) {
    if (req.params.id == "csrfToken") {
        if (req.query.action == "get") {
            const csrfToken = req.csrfToken();
            return res.status(200).json({ success: true, csrfToken });
        } else if (req.query.action == "check") {
            const { csrfToken } = req.body;
            if (!csrfToken) return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" });
            if (csrfToken !== req.csrfToken()) return res.status(500).json({ success: false, message: "INVALID_CSRF_TOKEN" });
            return res.status(200).json({ success: true, message: "VALID_CSRF_TOKEN" });
        } else return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
    } else if (req.params.id == "cookies") {
        return res.status(200).json({ success: true, cookiesSigned: req.signedCookies, cookiesUnsigned: req.cookies });
    } else if (req.params.id == "user") {
        if (req.query.action == "password-set") {
            const { oldpassword1, oldpassword2, newpassword } = req.body;
            if (!oldpassword1 || !oldpassword2 || !newpassword) return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" });
            if (oldpassword1 != oldpassword2) return res.status(500).json({ success: false, message: "PASSWORDS_NOT_MATCH" });
            if (!data) return res.status(500).json({ success: false, message: "USER_NOT_FOUND" });
            data.password = bcrypt.hashSync(newpassword, saltRounds);
            await data.save();
            return res.status(200).json({ success: true, message: "PASSWORD_CHANGED" });
        } else if (req.query.action == "settings") {
            if (req.query.action2 === "darkMode") {
                const { value } = req.body;
                if (value.toString() !== "true" && value.toString() !== "false") return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
                let newValue
                if (value.toString() === "true") newValue = true
                if (value.toString() === "false") newValue = false
                UserSettingsS.darkMode = newValue
                await UserSettingsS.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "localization") {
                const { value } = req.body;
                UserSettingsS.localization = value
                await UserSettingsS.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "sortingBy") {
                const { value } = req.body;
                UserSettingsS.sortingBy = value
                await UserSettingsS.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "sortingDirection") {
                const { value } = req.body;
                UserSettingsS.sortingDirection = value
                await UserSettingsS.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "showImage") {
                const { value } = req.body;
                if (value.toString() !== "true" && value.toString() !== "false") return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
                let newValue
                if (value.toString() === "true") newValue = true
                if (value.toString() === "false") newValue = false
                UserSettingsS.showImage = newValue
                await UserSettingsS.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "newWindowFileOpen") {
                const { value } = req.body;
                if (value.toString() !== "true" && value.toString() !== "false") return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
                let newValue
                if (value.toString() === "true") newValue = true
                if (value.toString() === "false") newValue = false
                UserSettingsS.newWindowFileOpen = newValue
                await UserSettingsS.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "adminMode") {
                if (!data.admin) return res.status(500).json({ success: false, message: "ACCESS_DENIED" });
                const { value } = req.body;
                if (value.toString() !== "true" && value.toString() !== "false") return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
                let newValue
                if (value.toString() === "true") newValue = true
                if (value.toString() === "false") newValue = false
                UserSettingsS.adminMode = newValue
                await UserSettingsS.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "get") {
                const { darkMode, localization, sortingBy, sortingDirection, showImage, newWindowFileOpen, adminMode } = UserSettingsS
                return res.status(200).json({ success: true, info: { admin: data.admin }, settings: { darkMode, localization, sortingBy, sortingDirection, showImage, newWindowFileOpen, adminMode } })
            } else return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
        } else return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
    } else if (req.params.id == "admin") {
        if (!data.admin) return res.status(500).json({ success: false, message: "ACCESS_DENIED" });
        async function getAllEmails() {
            const adminData = await User.findAll({ where: { admin: true } });
            const admins = [];
            adminData.forEach((user) => {
                admins.push({ id: user.id, email: user.email });
            });
            admins.sort((a, b) => a.id - b.id);
            return admins;
        }
        if (req.query.action == "add") {
            const { email } = req.body;
            if (!email) return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" });
            const data = await User.findOne({ where: { email: email.toLowerCase() } });
            if (!data) return res.status(500).json({ success: false, message: "EMAIL_NOT_FOUND" });
            if (data.admin) return res.status(500).json({ success: false, message: "EMAIL_ALREADY_ADMIN" });
            data.admin = true;
            await data.save();
            let admins = await getAllEmails();
            return res.status(200).json({ success: true, message: "EMAIL_ADMINED", list: admins });
        } else if (req.query.action == "remove") {
            const { email } = req.body;
            if (!email) return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" });
            const data = await User.findOne({ where: { email: email.toLowerCase() } });
            if (!data) return res.status(500).json({ success: false, message: "EMAIL_NOT_FOUND" });
            if (!data.admin) return res.status(500).json({ success: false, message: "EMAIL_NOT_ADMIN" });
            data.admin = false
            await data.save();
            let admins = await getAllEmails();
            return res.status(200).json({ success: true, message: "EMAIL_UNADMINED", list: admins });
        } else if (req.query.action == "get") {
            let admins = await getAllEmails();
            return res.status(200).json({ success: true, list: admins });
        } else return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
    } else if (req.params.id == "whitelist") {
        async function getAllEmails() {
            const data = await Whitelisted.findAll({ where: {} });
            const whitelist = [];
            data.forEach((user) => {
                whitelist.push({ id: user.id, email: user.email });
            });
            whitelist.sort((a, b) => a.id - b.id);
            return whitelist;
        }
        if (req.query.action == "add") {
            const { email } = req.body;
            if (!email) return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" });
            const data = await Whitelisted.findOne({ where: { email } });
            if (data) return res.status(500).json({ success: false, message: "EMAIL_ALREADY_WHITELISTED" });
            await Whitelisted.create({ email });
            let whitelist = await getAllEmails();
            return res.status(200).json({ success: true, message: "EMAIL_WHITELISTED", list: whitelist });
        } else if (req.query.action == "remove") {
            const { email } = req.body;
            if (!email) return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" });
            const data = await Whitelisted.findOne({ where: { email } });
            if (!data) return res.status(500).json({ success: false, message: "EMAIL_NOT_WHITELISTED" });
            await data.destroy();
            let whitelist = await getAllEmails();
            return res.status(200).json({ success: true, message: "EMAIL_UNWHITELISTED", list: whitelist });
        } else if (req.query.action == "get") {
            let whitelist = await getAllEmails();
            return res.status(200).json({ success: true, list: whitelist });
        } else return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
    } else return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
}