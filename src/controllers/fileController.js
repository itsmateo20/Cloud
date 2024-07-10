// src/controllers/fileController.js

const { existsSync, unlinkSync, createWriteStream, renameSync, rmSync, unlink } = require("fs");
const archiver = require('archiver');
const { join } = require("path");
const multer = require("multer");
const sharp = require('sharp');
const ffprobe = require('node-ffprobe')

exports.getFile = async (req, res) => {
    const { folder, folderPath, userFolderPath } = req.folders;
    if (!req.params.file) return res.redirect("/")

    if (req.params.file === "download") {
        const { name, path, type } = req.query;


        if (!name || !path || !type) return res.redirect("/?error=FILE_DOESNT_EXIST");
        if (type === "folder") {
            if (existsSync(`${folderPath}/${name}`) && existsSync(`${userFolderPath}${path}`)) {
                const zipFileName = `${name}.zip`;
                const zipFilePath = join(folderPath, zipFileName);
                const output = createWriteStream(zipFilePath);
                const archive = archiver('zip', {
                    zlib: { level: 0 },
                });

                archive.on('error', (err) => {
                    logger.log('Error during zip creation', err, { type: 'error', name: 'SITE-FILE-ZIP', msgColor: 'red' });
                    return res.redirect('/?error=ZIP_CREATION_ERROR');
                });

                output.on('close', async function () {
                    await res.download(zipFilePath, zipFileName, async (err) => {
                        if (err) {
                            logger.log('Error during download:', err, { type: 'error', name: 'SITE-FILE-ZIP', msgColor: 'red' });
                        } else {
                            await unlinkSync(zipFilePath);
                            if (existsSync(zipFilePath)) {
                                await unlinkSync(zipFilePath).catch((err) => {
                                    logger.log('Error during deleting zip file:', err, { type: 'error', name: 'SITE-FILE-ZIP', msgColor: 'red' });
                                });
                            }
                        }
                    });
                });

                archive.pipe(output);
                archive.directory(`${userFolderPath}${path}`, false);
                archive.finalize();
            } else return res.redirect("/?error=FOLDER_DOESNT_EXIST");

        } else {
            if (existsSync(`${userFolderPath}${folder}/${name}`) && existsSync(`${userFolderPath}${path}`)) {
                return res.download(`${userFolderPath}${path}`, async (err) => {
                    if (err) {
                        logger.log('Error during download:', err, { type: 'error', name: 'SITE-FILE-DOWNLOAD', msgColor: 'red' });
                    }
                });
            } else return res.redirect("/?error=FILE_DOESNT_EXIST");
        }
    } else res.redirect("/?error=UNKNOWN_ERROR")
};

exports.uploadFile = async (req, res) => {
    const { folder, folderPath } = req.folders;

    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, `${folderPath}`);
        },
        filename: (req, file, cb) => {
            cb(null, file.originalname);
        },
    });

    const upload = multer({ storage: storage }).array("files");
    let uploadingFiles

    upload(req, res, async (err) => {
        uploadingFiles = req.files
        // const filesExist = req.files.some((file) => {
        //     return existsSync(`${userFolderPath}${folder}/${file.originalname}`);
        // });

        // if (filesExist) {
        //     return res.status(200).json({ success: false, message: "FILE_ALREADY_EXISTS" });
        // }
        if (err) return res.status(500).json({ success: false, message: "ERROR_WHILE_UPLOADING_FILE" });

        let newFileData = []

        for (let i = 0; i < uploadingFiles.length; i++) {
            const file = uploadingFiles[i];
            const newFile = {}
            const { originalname, mimetype } = file;
            const isImage = mimetype.startsWith('image');
            const isVideo = mimetype.startsWith('video');
            const isDocument = mimetype.startsWith('text');
            const isAudio = mimetype.startsWith('audio');

            if (isImage) {
                const dimensions = await sharp(file.path).metadata();
                const { height, width } = dimensions;

                newFile.type = "image";
                newFile.height = height;
                newFile.width = width;
                newFile.redirect = `/image?path=${folder}/${originalname}`;
            } else if (isVideo) {
                const metadata = await ffprobe(file.path);
                const dimensions = metadata.streams[0];
                newFile.type = "video";
                newFile.height = dimensions.height;
                newFile.width = dimensions.width;
                newFile.redirect = `/video?path=${folder}/${originalname}`;
            } else if (isDocument) {
                newFile.type = "document";
                newFile.redirect = `/document?path=${folder}/${originalname}`;
            } else if (isAudio) {
                newFile.type = "audio";
                newFile.redirect = `/audio?path=${folder}/${originalname}`;
            } else {
                newFile.type = "other";
                newFile.redirect = `/file/download?name=${originalname}&path=${folder}/${originalname}&type=other`;
            }

            newFile.name = originalname;
            newFile.path = `${folder}/${originalname}`;

            newFileData.push(newFile)
        }

        return res.status(200).json({ success: true, message: "FILE_UPLOADED", files: newFileData });
    });
};

exports.renameFile = async (req, res) => {
    const { folder, folderPath, userFolderPath } = req.folders;
    const { name, path, type, newName } = req.body;

    if (!name || !path || !type || !newName) {
        return res.status(500).json({ success: false, message: "FILE_DOESNT_EXIST" });
    }

    if (type === "folder") {
        if (existsSync(`${userFolderPath}${folder}/${name}`) && existsSync(`${userFolderPath}${path}`)) {
            await renameSync(`${folderPath}/${name}`, `${folderPath}/${newFileName}`);
            return res.status(200).json({ success: true, message: "FOLDER_RENAMED" });
        } else {
            return res.status(500).json({ success: false, message: "FOLDER_DOESNT_EXIST" });
        }
    } else {
        if (existsSync(`${userFolderPath}${folder}/${name}`) && existsSync(`${userFolderPath}${path}`)) {
            let newFileName = `${newName}${name.substring(name.lastIndexOf('.'))}`

            await renameSync(`${folderPath}/${name}`, `${folderPath}/${newFileName}`);
            return res.status(200).json({ success: true, message: "FILE_RENAMED" });
        } else {
            return res.status(500).json({ success: false, message: "FILE_DOESNT_EXIST" });
        }
    }
};

exports.deleteFile = async (req, res) => {
    const { folderPath, userFolderPath } = req.folders;
    const { name, path, type } = req.body;

    if (!name || !path || !type) {
        return res.status(500).json({ success: false, message: "FILE_DOESNT_EXIST" });
    }


    if (existsSync(`${folderPath}/${name}`) && existsSync(`${userFolderPath}${path}`)) {
        if (type == "folder") {
            rmSync(`${userFolderPath}${path}`, { recursive: true, force: true });
            return res.status(200).json({ success: true, message: "FOLDER_DELETED" });
        } else {
            unlink(`${userFolderPath}${path}`, (err) => {
                if (err) {
                    return res.status(500).json({ success: false, message: "UNKNOWN_ERROR" });
                } else {
                    return res.status(200).json({ success: true, message: "FILE_DELETED" });
                }
            });
        }
    } else return res.status(500).json({ success: false, message: "FILE_DOESNT_EXIST" });
};