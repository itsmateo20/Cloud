const User = require("../models/User.js")
const jwt = require("jsonwebtoken");

module.exports = {
    name: "logout",
    url: "/logout",
    run: async (req, res) => {
        let decoded
        let data
        if (req.cookies.token) {
            try {
                decoded = jwt.verify(req.cookies.token, process.env.JWTSECRET, { algorithm: process.env.JWTALGORITHM })
            } catch (e) { }
            if (decoded) {
                data = await User.findOne({ where: { email: decoded.email, password: decoded.password } })
                if (!data) return res.redirect("/")
            }

            res.clearCookie("token")
            res.redirect("/")
        } else return res.redirect("/")
    }
}