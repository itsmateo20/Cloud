// server.js

const { createServer } = require("http");
const { Server } = require("socket.io");
const next = require("next");
const port = process.env.PORT || 3000;

const dev = process.env.NODE_ENV !== "production";
const app = next({ quiet: !dev, dev, turbo: !dev });
const handle = app.getRequestHandler();

const chalk = require("chalk");
const os = require('os');

console.clear();
console.log(` ${chalk.bold("○")} Booting up ...\n     ${chalk.bold.cyan("Environment:")} ${dev ? "Development" : "Production"}\n     ${chalk.bold.magenta("Turbo mode:")} ${!dev ? "No" : "Yes"}\n     ${chalk.bold.gray("Process version:")} ${process.version}\n     ${chalk.bold.gray("Platform:")} ${os.platform()} ${os.arch()} ${os.release()}\n     ${chalk.bold.gray("Time:")} ${new Date().toLocaleString()}\n`);

app.prepare().then(() => {
    const server = createServer((req, res) => handle(req, res));
    const io = new Server(server);

    global.io = io;

    io.on("connection", (socket) => {
        console.log(` ⚡ Socket ${chalk.bold.green("connected")}\n     ${chalk.bold.gray("ID:")} ${socket.id}\n     ${chalk.bold.gray("Secure:")} ${socket.handshake.secure}\n     ${chalk.bold.gray("Time:")} ${socket.handshake.time}`);
        socket.on('disconnect', () => {
            console.log(` ⚡ Socket ${chalk.bold.red("disconnected")}\n     ${chalk.bold.gray("ID:")} ${socket.id}\n     ${chalk.bold.gray("Secure:")} ${socket.handshake.secure}\n     ${chalk.bold.gray("Time:")} ${socket.handshake.time}`);
        });
    });

    server.listen(port, () => {
        const getIPv4Address = () => {
            const interfaces = os.networkInterfaces();
            for (const name of Object.keys(interfaces)) {
                for (const iface of interfaces[name]) {
                    if (iface.family === 'IPv4' && !iface.internal) {
                        return iface.address;
                    }
                }
            }
            return 'localhost';
        };

        const ipAddress = getIPv4Address();

        if (port !== process.env.PORT) console.log(` ${chalk.bold.yellow("⚠")} Port ${port} is in use, using available port ${process.env.PORT} instead.`);
        console.log(` ${chalk.bold.green("✓")} Booted up\n     ${chalk.bold.cyan("Local:")} http://localhost:${port}\n     ${chalk.bold.cyan("Network:")} http://${ipAddress}:${port}\n     ${chalk.bold.cyan("Secure:")} ${dev ? "No" : "Yes"}\n     ${chalk.bold.magenta("Turbo mode:")} ${!dev ? "No" : "Yes"}\n     ${chalk.bold.gray("Process version:")} ${process.version}\n     ${chalk.bold.gray("Platform:")} ${os.platform()} ${os.arch()} ${os.release()}\n     ${chalk.bold.gray("Time:")} ${new Date().toLocaleString()}\n`);
    });
});
