const User = require("../models/User.js");
const UserSettings = require("../models/UserSettings.js");
const jwt = require("jsonwebtoken");
const { readdirSync, mkdirSync, existsSync, readFileSync } = require("fs");
const { resolve, extname } = require("path");
const hljs = require('highlight.js');

module.exports = {
    name: "document",
    url: "/document",
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

        const docPath = `${userFolderPath}${req.query.path}`;
        const getDoc = existsSync(docPath);

        if (!getDoc) return res.redirect("/?error=FILE_DOESNT_EXIST");
        const doc = resolve(docPath)
        let fileContent = readFileSync(doc).toString();
        let fileExtension = extname(doc).slice(1);

        const languageMap = JSON.parse(readFileSync(__dirname + "/../dist/json/languageExtensionMap.json"))
        let languageExt = languageMap[fileExtension] || 'plaintext';

        let highlightedContent = hljs.highlight(fileContent, { language: languageExt, ignoreIllegals: false }).value;

        res.send(readFileSync(__dirname + `/document/${UserSettingsS.darkMode ? "dark" : "light"}-theme.html`).toString().replace("{}", `<pre>${highlightedContent}</pre>`));
    },
};
