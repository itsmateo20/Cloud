module.exports = {
    name: "register",
    url: "/register",
    run: async (req, res) => {
        res.redirect("/signup")
    }
}