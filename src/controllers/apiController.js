// src/controllers/apiController.js

const User = require("../models/User.js")
const UserSettings = require("../models/UserSettings.js")
const Whitelisted = require("../models/Whitelisted.js")
const bcrypt = require("bcrypt");
const saltRounds = 10;

exports.api = async (req, res) => {
    if (req.params.id === "env" || req.url.path === "/api/env" || req.url.startsWith("/api/env")) {
        if (req.query.action === "get") {
            const { DEFAULT_LANGUAGE } = process.env;
            return res.status(200).json({ success: true, env: { DEFAULT_LANGUAGE } });
        } else return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
    } else await ApiFunction(req, res);
}

async function ApiFunction(req, res) {
    // const UserSettingsS = await UserSettings.findOne({ where: { email: req.user.email } });

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
            if (!req.user) return res.status(500).json({ success: false, message: "USER_NOT_FOUND" });
            req.user.password = bcrypt.hashSync(newpassword, saltRounds);
            await req.user.save();
            return res.status(200).json({ success: true, message: "PASSWORD_CHANGED" });
        } else if (req.query.action == "settings") {
            if (req.query.action2 === "darkMode") {
                const { value } = req.body;
                if (value.toString() !== "true" && value.toString() !== "false") return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
                let newValue
                if (value.toString() === "true") newValue = true
                if (value.toString() === "false") newValue = false
                req.userSettings.darkMode = newValue
                await req.userSettings.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "localization") {
                const { value } = req.body;
                req.userSettings.localization = value
                await req.userSettings.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "sortingBy") {
                const { value } = req.body;
                req.userSettings.sortingBy = value
                await req.userSettings.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "sortingDirection") {
                const { value } = req.body;
                req.userSettings.sortingDirection = value
                await req.userSettings.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "showImage") {
                const { value } = req.body;
                if (value.toString() !== "true" && value.toString() !== "false") return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
                let newValue
                if (value.toString() === "true") newValue = true
                if (value.toString() === "false") newValue = false
                req.userSettings.showImage = newValue
                await req.userSettings.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "newWindowFileOpen") {
                const { value } = req.body;
                if (value.toString() !== "true" && value.toString() !== "false") return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
                let newValue
                if (value.toString() === "true") newValue = true
                if (value.toString() === "false") newValue = false
                req.userSettings.newWindowFileOpen = newValue
                await req.userSettings.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "adminMode") {
                if (!req.user.admin) return res.status(500).json({ success: false, message: "ACCESS_DENIED" });
                const { value } = req.body;
                if (value.toString() !== "true" && value.toString() !== "false") return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
                let newValue
                if (value.toString() === "true") newValue = true
                if (value.toString() === "false") newValue = false
                req.userSettings.adminMode = newValue
                await req.userSettings.save()
                res.status(200).json({ success: true, message: "UPDATED_SETTING" })
            } else if (req.query.action2 === "get") {
                const { darkMode, localization, sortingBy, sortingDirection, showImage, newWindowFileOpen, adminMode } = req.userSettings
                return res.status(200).json({ success: true, info: { admin: req.user.admin }, settings: { darkMode, localization, sortingBy, sortingDirection, showImage, newWindowFileOpen, adminMode } })
            } else return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
        } else return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" })
    } else if (req.params.id == "admin") {
        if (!req.user.admin) return res.status(500).json({ success: false, message: "ACCESS_DENIED" });
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