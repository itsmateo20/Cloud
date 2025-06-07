module.exports = {
    name: "404",
    url: "/404",
    run: async (req, res) => {
        res.redirect('/')
    }
}