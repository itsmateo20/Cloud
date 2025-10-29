// server.js

(() => {
    try {
        const TS = typeof TransformStream !== 'undefined'
            ? TransformStream
            : (require('stream/web').TransformStream);

        if (typeof global.TextEncoderStream === 'undefined' && TS) {
            const _TextEncoder = typeof TextEncoder !== 'undefined' ? TextEncoder : require('util').TextEncoder;
            global.TextEncoderStream = class TextEncoderStream {
                constructor() {
                    const encoder = new _TextEncoder();
                    const transformer = new TS({
                        transform(chunk, controller) {
                            const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : encoder.encode(String(chunk));
                            controller.enqueue(bytes);
                        }
                    });
                    this.readable = transformer.readable;
                    this.writable = transformer.writable;
                }
            };
        }

        if (typeof global.TextDecoderStream === 'undefined' && TS) {
            const _TextDecoder = typeof TextDecoder !== 'undefined' ? TextDecoder : require('util').TextDecoder;
            global.TextDecoderStream = class TextDecoderStream {
                constructor(label = 'utf-8', options) {
                    const decoder = new _TextDecoder(label, options);
                    const transformer = new TS({
                        transform(chunk, controller) {
                            const view = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
                            controller.enqueue(decoder.decode(view, { stream: true }));
                        },
                        flush(controller) {
                            const tail = decoder.decode();
                            if (tail) controller.enqueue(tail);
                        }
                    });
                    this.readable = transformer.readable;
                    this.writable = transformer.writable;
                }
            };
        }
    } catch { }
})();

const { createServer } = require("http");
require('./lib/memoryMonitor.js');
const { Server } = require("socket.io");
const next = require("next");
const port = process.env.PORT || 3000;

const dev = process.env.NODE_ENV !== "production";
const app = next({ quiet: !dev, dev, turbo: false });
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

        socket.on('register-user', (payload) => {
            try {
                const userId = payload && (payload.userId || payload.id);
                if (userId) {
                    const room = `user:${userId}`;
                    socket.join(room);
                    console.log(`   → joined room ${room}`);
                }
            } catch { }
        });
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
