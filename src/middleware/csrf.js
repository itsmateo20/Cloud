module.exports = async (req, res, next) => {
    console.log(req.body._csrf, req.session.csrfToken, req.body._csrf !== req.session.csrfToken);
    if (req.body._csrf !== req.session.csrfToken) {
        return res.status(403).json({ success: false, message: "INVALID_CSRF" });
    }
    next();
}