// src/controllers/documentController.js

const { existsSync, readFileSync } = require("fs");
const { resolve, extname } = require("path");
const hljs = require('highlight.js');

exports.getDocument = async (req, res) => {
    const docPath = `${req.folders.userFolderPath}${req.query.path}`;
    const getDoc = existsSync(docPath);

    if (!getDoc) return res.redirect("/?error=FILE_DOESNT_EXIST");
    const doc = resolve(docPath)
    let fileContent = readFileSync(doc).toString();
    let fileExtension = extname(doc).slice(1);

    const languageMap = JSON.parse(readFileSync(__dirname + "/../dist/json/languageExtensionMap.json"))
    let languageExt = languageMap[fileExtension] || 'plaintext';

    let highlightedContent = hljs.highlight(fileContent, { language: languageExt, ignoreIllegals: false }).value;

    res.send(readFileSync(__dirname + `/document/${req.userSettings.darkMode ? "dark" : "light"}-theme.html`).toString().replace("{}", `<pre>${highlightedContent}</pre>`));
};

exports.convertDocument = async (req, res) => {
    let args = {
        body: [`Konwersja plików | Chmura`],
        email: data.email,
        directory: folder,

        admin: data.admin,

        loggedIn: true,
    };
    res.render("../pages/conversion.ejs", args);
};