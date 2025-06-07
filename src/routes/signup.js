const User = require("../models/User.js")
const UserSettings = require("../models/UserSettings.js")
const Whitelisted = require("../models/Whitelisted.js");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const saltRounds = 10;

module.exports = {
    name: "signup",
    url: "/signup",
    run: async (req, res) => {
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
            csrfToken: req.csrfToken(),

            loggedIn: false,
        }

        if (settings) {
            const localizationContent = await require("../dist/localization/" + settings.localization + ".json")
            args.body = [`${localizationContent.Pages["SignUp"]} | ${localizationContent.Main["Title"]}`]
        }

        res.render("../pages/signup.ejs", args)
    },
    run2: async (req, res) => {
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
    }
}