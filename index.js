require("dotenv").config()
const logger = require("./src/components/logger.js")

async function BeforeStart() {
    if (process.argv.includes("--setup")) {
        await require("./src/components/setup.js")().then((success) => {
            if (success) logger.log("Setup complete.", null, { line: true, type: "info", name: "SETUP" })
            return process.exit(0)
        }).catch((err) => {
            logger.log("Setup failed.", err, { line: true, type: "error", name: "SETUP", msgColor: "red" })
            return process.exit(0)
        })
    }

    if (process.env.CHECKVERSION == "true") {
        const { checkForUpdates } = require("./src/components/checkVersion.js")
        await checkForUpdates().then(() => {
            logger.log("Version check complete.", null, { line: true, type: "info", name: "VERSION" })
        }).catch((err) => {
            logger.log("Version check failed.", err, { line: true, type: "error", name: "VERSION", msgColor: "red" })
        })
    }

    if (process.argv.includes("--update")) {
        const { isOutdated, fetchLatestVersion } = require("./src/components/checkVersion.js")
        const { downloadAndApplyUpdate } = require("./src/components/autoUpdate.js")
        const version = await fetchLatestVersion()
        if (isOutdated) {
            await downloadAndApplyUpdate(version).then(() => {
                logger.log("Update complete.", null, { line: true, type: "info", name: "UPDATE" })
            }).catch((err) => {
                logger.log("Update failed.", err, { line: true, type: "error", name: "UPDATE", msgColor: "red" })
            })
        }
        return process.exit(0)
    }

    if (process.env.DISCORD_ACTIVITY == "true") {
        const { deploy } = require("./src/components/discordActivity.js")
        await deploy()
        logger.log("Discord activity started.", null, { line: true, type: "info", name: "DISCORD" })
    }
}

BeforeStart().then(() => {
    const express = require('express')
    const expressSession = require('express-session')
    const rateLimit = require("express-rate-limit");
    const app = express()
    const setupRoutes = require('./src/routes.js');

    const CookieParser = require("cookie-parser")
    const csrfProtection = require('./src/components/csrfProtection.js')
    const nocache = require('nocache');

    const ffprobe = require('node-ffprobe')
    const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

    ffprobe.FFPROBE_PATH = ffprobeInstaller.path
    ffprobe.SYNC = true


    require("./database.js").execute().then(async () => {
        app.disable('x-powered-by')
        app.disable('x-content-type-options')
        app.set("etag", false)

        app.use(express.urlencoded({ extended: false }))
        app.use(express.json());
        app.use(CookieParser(process.env.COOKIE_SECRET))
        app.use(expressSession({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true, cookie: { secure: true, sameSite: "strict", maxAge: 1000 * 60 * 60 * 24 * 7, httpOnly: true } }))
        app.use(csrfProtection)
        app.use(nocache())
        app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000 }))

        app.set("view engine", "ejs")
        app.set("views", __dirname + "/src/pages")
        app.use(express.static(__dirname + '/src/assets/'))
        app.use(express.static(__dirname + '/src/dist/'))

        logger.log(`Started loading routes`, null, { type: "info", name: "ROUTING" })
        await setupRoutes(app)

        app.use(function (req, res, next) {
            res.status(404).send("404 Not Found")
            logger.log(`404 Not Found: ${req.url}`, null, { type: "warn", name: "USER", msgColor: "red" })
        });

        logger.log(`Starting on port {green ${process.env.PORT}}`, null, { type: "info", name: "SITE" })
        app.listen(process.env.PORT, () => logger.log(`Webpage listening on port {green ${process.env.PORT}} {gray - You can now view your cloud on http://localhost:${process.env.PORT}}`, null, { type: "info", name: "SITE" }))
    }).catch((err) => {
        logger.log("Failed to connect to database.", err, { type: "error", name: "SITE" })
        return process.exit(1)
    })

    process.on('unhandledRejection', (reason, error) => {
        logger.log("Unhandled Rejection at ", reason + error, { type: "error", name: "SITE" })
    });
})