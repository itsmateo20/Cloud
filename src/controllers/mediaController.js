// src/controllers/mediaController.js

const { mkdirSync, existsSync, statSync, createReadStream } = require("fs");
const { resolve, basename } = require("path");
const ffprobe = require('node-ffprobe');
const sharp = require('sharp');

exports.getVideo = async (req, res) => {
    const videoPath = `${req.folders.userFolderPath}${req.query.path}`;
    const getVideo = existsSync(videoPath);

    if (!getVideo) return res.redirect("/?error=FILE_DOESNT_EXIST");
    const video = resolve(videoPath);


    if (req.query.preview && req.query.preview == "true") {
        let filename = basename(video);
        const tempFolder = existsSync(__dirname + `/../../temp/`);
        if (!tempFolder) mkdirSync(__dirname + `/../../temp`);
        const tempUserFolder = existsSync(__dirname + `/../../temp/${req.user.email}/`);
        if (!tempUserFolder) mkdirSync(__dirname + `/../../temp/${req.user.email}`);
        const tempPath = __dirname + `/../../temp/${req.user.email}/`;
        const tempImagePath = resolve(tempPath + filename + '.png')
        if (!existsSync(tempImagePath)) await ffmpeg(video).takeScreenshots({ count: 1, timemarks: ['0'], filename: filename + '.png' }, tempPath)
        while (!existsSync(tempImagePath)) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        if (existsSync(tempImagePath)) {
            const imageInfo = await sharp(tempImagePath).metadata();
            const originalWidth = imageInfo.width;
            const originalHeight = imageInfo.height;
            const resizedWidth = Math.round(originalWidth / 4);
            const resizedHeight = Math.round(originalHeight / 4);

            const resizedImage = await sharp(tempImagePath).resize(resizedWidth, resizedHeight).toBuffer();
            res.type("image/png").send(resizedImage);
        }
    } else {
        const stat = statSync(video);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = createReadStream(video, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            createReadStream(video).pipe(res);
        }
    }
};

exports.getAudio = async (req, res) => {
    const audioPath = `${req.folders.userFolderPath}${req.query.path}`;
    const getAudio = existsSync(audioPath);

    if (!getAudio) return res.redirect("/?error=FILE_DOESNT_EXIST");
    const audio = resolve(audioPath);

    res.sendFile(audio);
};

exports.getImage = async (req, res) => {
    const imagePath = `${req.folders.userFolderPath}${req.query.path}`;
    const getImage = existsSync(imagePath);

    if (!getImage) return res.redirect("/?error=FILE_DOESNT_EXIST");
    const image = resolve(imagePath);

    if (req.query.preview && req.query.preview == "true") {
        const imageInfo = await sharp(image).metadata();
        const originalWidth = imageInfo.width;
        const originalHeight = imageInfo.height;
        const resizedWidth = Math.round(originalWidth / 4);
        const resizedHeight = Math.round(originalHeight / 4);

        const resizedImage = await sharp(image).resize(resizedWidth, resizedHeight).toBuffer();
        res.type("image/png").send(resizedImage);
    } else res.sendFile(image);
};