// src/routes.js

const logger = require('./components/logger');

const apiController = require('./controllers/apiController');
const authController = require('./controllers/authController');
const documentController = require('./controllers/documentController');
const fileController = require('./controllers/fileController');
const folderController = require('./controllers/folderController');
const mediaController = require('./controllers/mediaController');
const postAuthMiddleware = require('./middleware/postAuth');
const authMiddleware = require('./middleware/auth');

module.exports = (app) => {
    app.get('/', authMiddleware, folderController.getHome);
    app.get('/folder/:folder', authMiddleware, folderController.getFolder);
    app.get('/file/:file', authMiddleware, fileController.getFile);
    app.post('/file/upload', authMiddleware, fileController.uploadFile);
    app.post('/file/rename', authMiddleware, fileController.renameFile);
    app.post('/file/delete', authMiddleware, fileController.deleteFile);
    app.get('/video', authMiddleware, mediaController.getVideo);
    app.get('/audio', authMiddleware, mediaController.getAudio);
    app.get('/image', authMiddleware, mediaController.getImage);
    app.get('/document', authMiddleware, documentController.getDocument);
    app.get('/convert', authMiddleware, documentController.convertDocument);
    app.get('/login', authController.login);
    app.post('/login', authController.postLogin);
    app.get('/signup', authController.signup);
    app.post('/signup', authController.postSignup);
    app.get('/logout', authController.logout);
    app.get('/register', (req, res) => {
        res.redirect('/signup');
    });

    app.get('/api/env', apiController.api);
    app.post('/api/env', apiController.api);

    app.get('/api/:id', postAuthMiddleware, apiController.api);
    app.post('/api/:id', postAuthMiddleware, apiController.api);

    logger.log(`Finished loading routes`, null, { line: true, type: "info", name: "ROUTING" })
};