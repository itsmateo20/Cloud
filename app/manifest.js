export default function manifest() {
    return {
        name: "Cloud Storage",
        short_name: "Cloud",
        description: "The Cloud Storage App is a web-based application designed for users to store and manage their files and folders in the cloud. It offers a convenient way to organize, upload, download, and delete files and folders, making it easy to access your data from anywhere.",
        start_url: "/",
        display: "standalone",
        background_color: "#303030",
        theme_color: "#303030",
        icons: [
            {
                src: "/assets/logo/rounded-192x192.png",
                sizes: "192x192",
                type: "image/png",
            },
            {
                src: "/assets/logo/rounded-512x512.png",
                sizes: "512x512",
                type: "image/png",
            },
        ],
    }
}