const User = require("../models/User.js");
const UserSettings = require("../models/UserSettings.js");
const Whitelisted = require("../models/Whitelisted.js");
const jwt = require("jsonwebtoken");
const { readdirSync, mkdirSync, statSync, readFileSync } = require("fs");
const { join, extname, relative } = require("path");
const sharp = require('sharp');
const ffprobe = require('node-ffprobe')

const fileExtentionMap = JSON.parse(readFileSync(__dirname + "/../dist/json/fileExtensionMap.json"))

module.exports = {
    name: "Home",
    url: "/",
    run: async (req, res) => {
        delete require.cache[require.resolve("../pages/home.ejs")];

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

        let folder
        if (req.cookies.folder) folder = `${req.cookies.folder}`
        else folder = "/";


        const userFolder = readdirSync(`${process.env.USERS_DIR}`).some(
            (folder) => folder.toLowerCase() === decoded.email
        );

        if (!userFolder) {
            mkdirSync(`${process.env.USERS_DIR}/${decoded.email}`);
        }

        let userFolderPath = `${process.env.USERS_DIR}${decoded.email}/`;

        if (UserSettingsS.adminMode) {
            userFolderPath = `${process.env.USERS_DIR}`;
        }

        const folderPath = `${userFolderPath}${folder}`;

        try {
            await readdirSync(folderPath)
        } catch (e) {
            res.clearCookie('folder');
            return res.redirect("/?error=INVALID_FOLDER")
        }


        async function getSubfolders(directory, items) {
            const entries = readdirSync(directory);

            for (const entry of entries) {
                const entryPath = join(directory, entry);
                let entryRelativePath = relative(userFolderPath, entryPath).toString().replace(/\\/g, "/");
                const isDirectory = statSync(entryPath).isDirectory();


                let url = "assets/icons/other.png";
                let relativePath = "";
                let type = "other";
                let length = 0
                let height = 100;
                let width = 300;

                const extnameS = extname(entry).toLowerCase()

                if (isDirectory || extnameS === "" || extnameS === "." || !extnameS) {
                    relativePath = `/folder/folder?path=${entryRelativePath}`
                    url = "icons/folder.png";
                    type = "folder";
                } else if (fileExtentionMap["image"].toString().includes(extnameS)) {
                    relativePath = `/image?path=${entryRelativePath}`
                    url = "icons/image.png"
                    type = "image";

                    const dimensions = await sharp(entryPath).metadata();
                    height = dimensions.height;
                    width = dimensions.width;
                } else if (fileExtentionMap["video"].toString().includes(extnameS)) {
                    relativePath = `/video?path=${entryRelativePath}`
                    url = "icons/video.png";
                    type = "video";

                    const metadata = await ffprobe(entryPath);
                    const dimensions = metadata.streams[0]
                    const dimensions2 = metadata.streams[1]
                    length = metadata.format.duration || 1;
                    height = dimensions.height || dimensions2.height || 100;
                    width = dimensions.width || dimensions2.width || 300;
                } else if (fileExtentionMap["audio"].toString().includes(extnameS)) {
                    relativePath = `/audio?path=${entryRelativePath}`
                    url = "icons/audio.png";
                    type = "audio";
                } else if (fileExtentionMap["document"].toString().includes(extnameS)) {
                    relativePath = `/document?path=${entryRelativePath}`
                    url = "icons/document.png";
                    type = "document";
                } else {
                    relativePath = `/file/download?name=${entry}&path=${entryRelativePath}&type=other`
                    url = "icons/other.png";
                    type = "other";
                }

                const itemInfo = {
                    name: entry,
                    type: type,
                    size: isDirectory ? null : statSync(entryPath).size,
                    length: isDirectory ? null : (type === "video" ? length : 0),
                    height: isDirectory ? null : height,
                    width: isDirectory ? null : width,
                    dateModified: statSync(entryPath).mtimeMs,
                    dateCreated: statSync(entryPath).birthtimeMs,
                    redirect: relativePath,
                    path: entryRelativePath,
                    imageurl: url,
                };

                items.push(itemInfo);
            }

            items.sort((a, b) => {
                if (a.type === "folder" && b.type !== "folder") {
                    return -1;
                } else if (a.type !== "folder" && b.type === "folder") {
                    return 1;
                } else if (a.type === "folder" && b.type === "folder") {
                    return a.name.localeCompare(b.name);
                } else if (a.type === "audio" && b.type !== "audio") {
                    return 1;
                } else if (a.type !== "audio" && b.type === "audio") {
                    return -1;
                } else if (a.type === "audio" && b.type === "audio") {
                    return a.name.localeCompare(b.name);
                } else if (a.type === "document" && b.type !== "document") {
                    return 1;
                } else if (a.type !== "document" && b.type === "document") {
                    return -1;
                } else if (a.type === "document" && b.type === "document") {
                    return a.name.localeCompare(b.name);
                } else return sort(UserSettingsS.sortingBy, UserSettingsS.sortingDirection, a, b);
            });

            return items;
        }


        const items = [];
        await getSubfolders(folderPath, items);

        if (folder.includes("//")) folder = folder.replace("//", "/");

        let args = {
            body: [`Główna strona | Chmura`],
            email: data.email,
            items: items,
            directory: folder,

            admin: data.admin,

            loggedIn: true,
        };

        const localizationContent = await require("../dist/localization/" + UserSettingsS.localization + ".json")
        args.body = [`${localizationContent.Pages["Home"]} | ${localizationContent.Main["Title"]}`]

        if (data.admin) {
            const whitelisted = await Whitelisted.findAll();
            const whitelist = [];
            whitelisted.forEach((user) => {
                whitelist.push({ id: user.id, email: user.email });
            });
            whitelist.sort((a, b) => a.id - b.id);
            args.whitelistList = whitelist;

            const admins = await User.findAll({ where: { admin: true } });
            const adminList = [];
            admins.forEach((user) => {
                adminList.push({ id: user.id, email: user.email });
            });
            adminList.sort((a, b) => a.id - b.id);
            args.adminList = adminList;
        }

        res.render("../pages/home.ejs", args);
    },
};


function sort(by, direction, a, b) {
    if (by === "name") {
        return direction === "desc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
    } else if (by === "type") {
        return direction === "desc" ? a.type.localeCompare(b.type) : b.type.localeCompare(a.type);
    } else if (by === "size") {
        return direction === "desc" ? b.size - a.size : a.size - b.size;
    } else if (by === "length") {
        return direction === "desc" ? b.length - a.length : a.length - b.length;
    } else if (by === "dimensions") {
        const areaA = a.height * a.width;
        const areaB = b.height * b.width;
        return direction === "desc" ? areaB - areaA : areaA - areaB;
    } else if (by === "dateModified" || by === "dateCreated") {
        const timestampA = new Date(a[by]).getTime();
        const timestampB = new Date(b[by]).getTime();
        return direction === "desc" ? timestampB - timestampA : timestampA - timestampB;
    }
}

