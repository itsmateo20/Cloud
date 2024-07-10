// src/controllers/folderController.js

const User = require("../models/User.js");
const Whitelisted = require("../models/Whitelisted.js");
const { readdirSync, statSync, readFileSync } = require("fs");
const { join, extname, relative } = require("path");
const sharp = require('sharp');
const ffprobe = require('node-ffprobe')

const fileExtensionMap = JSON.parse(readFileSync(__dirname + "/../dist/json/fileExtensionMap.json"))

exports.getHome = async (req, res) => {
    delete require.cache[require.resolve("../pages/home.ejs")];

    const items = [];
    await getFolders(req.folders.folderPath, items, req.folders.userFolderPath, req.userSettings);

    if (req.folders.folder.includes("//")) req.folders.folder = req.folders.folder.replace("//", "/");

    let args = {
        body: [`Główna strona | Chmura`],
        email: req.user.email,
        items: items,
        directory: req.folders.folder,

        admin: req.user.admin,

        loggedIn: true,
    };

    const localizationContent = await require("../dist/localization/" + req.userSettings.localization + ".json")
    args.body = [`${localizationContent.Pages["Home"]} | ${localizationContent.Main["Title"]}`]

    if (req.user.admin) {
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
};

exports.getFolder = async (req, res) => {
    const { folder, userFolderPath } = req.folders;
    if (!req.params.folder) return res.redirect("/")

    if (req.params.folder === "back") {

        const folders = folder.split('/').filter(folder => folder.trim() !== '');

        if (folders.length >= 1) {
            folders.pop();
            const newFolderPath = "/" + folders.join('/')

            res.cookie('folder', newFolderPath);
        }
    } else if (req.params.folder === "root") {
        res.clearCookie('folder');
    } else if (req.params.folder == "folder") {
        if (req.query.path.startsWith("/")) {
            res.cookie("folder", `${req.query.path}`, { path: "/" });
        } else {
            res.cookie("folder", `/${req.query.path}`, { path: "/" });
        }
    } else if (req.params.folder === "new") {
        if (req.query.name) {
            if (readdirSync(`${userFolderPath}${folder}`)) {
                if (readdirSync(`${userFolderPath}${folder}`).includes(req.query.name)) {
                    res.cookie('folder', folder + "/" + req.query.name)
                } else {
                    await mkdirSync(`${userFolderPath}${folder}/${req.query.name}`)

                    if (readdirSync(`${userFolderPath}${folder}/${req.query.name}`)) {
                        res.cookie('folder', folder + "/" + req.query.name);
                    }
                }
            }
        }
    } else return res.redirect("/?error=INVALID_FOLDER")

    res.redirect("/")
};

async function sort(by, direction, a, b) {
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

async function getFolders(directory, items, userFolderPath, userSettings) {
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
        } else if (fileExtensionMap["image"].toString().includes(extnameS)) {
            relativePath = `/image?path=${entryRelativePath}`
            url = "icons/image.png"
            type = "image";

            const dimensions = await sharp(entryPath).metadata();
            height = dimensions.height;
            width = dimensions.width;
        } else if (fileExtensionMap["video"].toString().includes(extnameS)) {
            relativePath = `/video?path=${entryRelativePath}`
            url = "icons/video.png";
            type = "video";

            const metadata = await ffprobe(entryPath);
            const dimensions = metadata.streams[0]
            const dimensions2 = metadata.streams[1]
            length = metadata.format.duration || 1;
            height = dimensions.height || dimensions2.height || 100;
            width = dimensions.width || dimensions2.width || 300;
        } else if (fileExtensionMap["audio"].toString().includes(extnameS)) {
            relativePath = `/audio?path=${entryRelativePath}`
            url = "icons/audio.png";
            type = "audio";
        } else if (fileExtensionMap["document"].toString().includes(extnameS)) {
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
        } else return sort(userSettings.sortingBy, userSettings.sortingDirection, a, b);
    });

    return items;
}