require("dotenv").config()
const { gray, cyan, red } = require("chalk")

const express = require('express')
const app = express()
const CookieParser = require("cookie-parser")
const UrlEncodedParser = require("body-parser").urlencoded({ extended: false })

const { readdirSync } = require('fs')
const database = require("./database.js")

const ffprobe = require('node-ffprobe')
const ffprobeInstaller = require('@ffprobe-installer/ffprobe')

ffprobe.FFPROBE_PATH = ffprobeInstaller.path
ffprobe.SYNC = true



database.execute().then(async () => {
    app.use((req, res, next) => {
        res.setHeader('x-content-type-options', 'nosniff');
        res.setHeader('cache-control', 'no-cache, proxy-revalidate');
        next();
    });
    app.disable('x-powered-by');
    app.enable("trust proxy")
    app.set("etag", false)
    app.use(CookieParser())
    app.use(UrlEncodedParser)
    app.use(express.json());
    app.set("view engine", "ejs")
    app.set("views", __dirname + "/src/pages")
    app.use(express.static(__dirname + '/src/assets/'))
    // app.use(express.static('../../.././Users/'));

    let files = readdirSync(__dirname + '/src/routes/')
    files.forEach(f => {
        const file = require(`./src/routes/${f}`)
        if (file && file.url) {
            if (file.run) app.get(file.url, file.run)
            if (file.run2) app.post(file.url, file.run2)
            console.log(gray("[SITE]: ") + cyan(`Loaded /${file.name.toLowerCase()}`))
        }
    })

    app.use((req, res) => {
        res.status(404).redirect("/404")
    });
    app.use((req, res) => {
        res.status(302).redirect("/404")
    });

    app.listen(process.env.PORT || 7250, () => console.log(gray("[SITE]: ") + cyan(`Listening on port ${process.env.PORT || 7250}`)))
});

process.on('unhandledRejection', (reason, error) => {
    console.error(gray("[SITE]: ") + red('Unhandled Rejection reason:', reason));
    console.error(error);
});