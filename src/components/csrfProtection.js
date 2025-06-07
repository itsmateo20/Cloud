const crypto = require('crypto');

function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

function csrfProtection(req, res, next) {
    if (!req.session.csrfToken) {
        req.session.csrfToken = generateToken();
    }
    res.locals.csrfToken = req.session.csrfToken;
    next();
}

module.exports = csrfProtection;
