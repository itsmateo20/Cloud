// src/controllers/authController.js

const User = require("../models/User.js")
const UserSettings = require("../models/UserSettings.js")
const Whitelisted = require("../models/Whitelisted.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

exports.login = async (req, res) => {
    delete require.cache[require.resolve("../pages/login.ejs")]

    let decoded
    let data
    let settings
    if (req.cookies.token) {
        try {
            decoded = jwt.verify(req.cookies.token, process.env.JWTSECRET)
        } catch (e) { }
        if (decoded) {
            data = await User.findOne({ where: { email: decoded.email, password: decoded.password } })
            const UserSettingS = await UserSettings.findOne({ where: { email: decoded.email } })
            if (!UserSettingS) await UserSettings.create({ email: decoded.email })
            settings = await UserSettings.findOne({ where: { email: decoded.email } })
            if (!data) return res.clearCookie("token").redirect("/login")
        } else {
            res.clearCookie("token").redirect("/login")
        }
        if (decoded && data && settings) return res.redirect("/")
    }


    let args = {
        body: ["Zaloguj się | Chmura"],
        csrfToken: res.locals.csrfToken,

        loggedIn: false,
    }

    if (settings) {
        const localizationContent = await require("../dist/localization/" + settings.localization + ".json")
        args.body = [`${localizationContent.Pages["Login"]} | ${localizationContent.Main["Title"]}`]
    }

    res.render("../pages/login.ejs", args)
};

exports.postLogin = async (req, res) => {
    let { email, password } = req.body;

    if (!email || !password) return res.redirect("/login?error=MISSING_DATA_LOGIN")
    const UserS = await User.findOne({ where: { email: email } })
    const UserSettingsS = await UserSettings.findOne({ where: { email: email } })
    const WhitelistedS = await Whitelisted.findOne({ where: { email: email } })

    if (UserS) {
        if (!WhitelistedS && !UserS.admin) return res.redirect("/login?error=EMAIL_NOT_WHITELISTED")
        if (!bcrypt.compareSync(password, UserS.password)) return res.redirect("/login?error=INCORRECT_DATA_LOGIN")
        UserS.token = jwt.sign({ email: UserS.email, password: UserS.password }, process.env.JWTSECRET, { algorithm: process.env.JWTALGORITHM, expiresIn: process.env.JWTEXPIRESIN })
        await UserS.save()
        if (!UserSettingsS) {
            await UserSettings.create({ email: email })
        }

        res.cookie("token", UserS.token, { maxAge: process.env.LOGGED_IN_TIMEOUT_MS })
        res.redirect("/")
    } else if (!UserS) {
        res.redirect("/login?error=INCORRECT_DATA_LOGIN")
    }
}

exports.signup = async (req, res) => {
    delete require.cache[require.resolve("../pages/signup.ejs")]

    let decoded
    let data
    let settings
    if (req.cookies.token) {
        try {
            decoded = jwt.verify(req.cookies.token, process.env.JWTSECRET)
        } catch (e) { }
        if (decoded) {
            data = await User.findOne({ where: { email: decoded.email, password: decoded.password } })
            const UserSettingS = await UserSettings.findOne({ where: { email: decoded.email } })
            if (!UserSettingS) await UserSettings.create({ email: decoded.email })
            settings = await UserSettings.findOne({ where: { email: decoded.email } })
            if (data && data.settings) return res.redirect("/login")
        } else {
            res.clearCookie("token").reload()
        }
        if (decoded && data) return res.redirect("/")
    }


    let args = {
        body: ["Zarejestruj się | Chmura"],
        csrfToken: res.locals.csrfToken,

        loggedIn: false,
    }

    if (settings) {
        const localizationContent = await require("../dist/localization/" + settings.localization + ".json")
        args.body = [`${localizationContent.Pages["SignUp"]} | ${localizationContent.Main["Title"]}`]
    }

    res.render("../pages/signup.ejs", args)
};

exports.postSignup = async (req, res) => {
    const { email, password1, password2 } = req.body;

    if (!email || !password1 || !password2) return res.redirect("/signup?error=MISSING_DATA_SIGNUP")
    if (password1 !== password2) return res.redirect("/signup?error=PASSWORD_NOT_MATCH_SIGNUP")

    const WhitelistedS = await Whitelisted.findOne({ where: { email: email } })
    if (!WhitelistedS && !User.findOne({ where: { email: email } }).admin) return res.redirect("/signup?error=EMAIL_NOT_WHITELISTED")

    try {
        const UserFind = await User.findOne({ where: { email: email } })
        if (UserFind) return res.redirect("/signup?error=ACCOUNT_ALREADY_EXISTS_SIGNUP")
        const password = bcrypt.hashSync(password1, saltRounds)
        const UserS = await User.create({ email: email, password: password });
        UserS.token = jwt.sign({ email: email, password: UserS.password }, process.env.JWTSECRET, { algorithm: process.env.JWTALGORITHM, expiresIn: process.env.JWTEXPIRESIN });
        await UserS.save();
        const UserSettingsS = await UserSettings.create({ email: email })
        await UserSettingsS.save()



        res.cookie("token", UserS.token, { maxAge: 86400000 });
        res.redirect("/login");
    } catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            res.redirect("/signup?error=ACCOUNT_ALREADY_EXISTS_SIGNUP");
        } else {
            console.error(error);
            res.redirect("/signup?error=UNKNOWN_ERROR");
        }
    }
};

exports.logout = async (req, res) => {
    let decoded
    let data
    if (req.cookies.token) {
        try {
            decoded = jwt.verify(req.cookies.token, process.env.JWTSECRET, { algorithm: process.env.JWTALGORITHM })
        } catch (e) { }
        if (decoded) {
            data = await User.findOne({ where: { email: decoded.email, password: decoded.password } })
            if (!data) return res.redirect("/")
        }

        res.clearCookie("token")
        res.redirect("/")
    } else return res.redirect("/")
};