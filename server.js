// server.js
const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    const server = createServer((req, res) => handle(req, res));
    const io = new Server(server);

    // Make io accessible globally
    global.io = io;

    io.on("connection", (socket) => {
        console.log("⚡ Socket connected:", socket.id);
    });

    server.listen(3000, () => {
        console.log("✅ Ready on http://localhost:3000");
    });
});
