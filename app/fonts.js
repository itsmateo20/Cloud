import { Poppins, Rubik, Noto_Color_Emoji } from "next/font/google"

export const poppins = Poppins({
    weight: ["400", "500", "600", "700", "800"],
    style: "normal",
    subsets: ["latin"],
    preload: true,
    variable: "--font-poppins",
    display: "swap",
})

export const rubik = Rubik({
    weight: ["400", "500", "600", "700", "800"],
    style: "normal",
    subsets: ["latin"],
    preload: true,
    variable: "--font-rubik",
    display: "swap",
})

export const notoColorEmoji = Noto_Color_Emoji({
    weight: ["400"],
    subsets: ["emoji"],
    preload: true,
    variable: "--font-noto-color-emoji",
    display: "swap",
})


export default [poppins.variable, rubik.variable, notoColorEmoji.variable]