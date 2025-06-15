import { Poppins, Rubik } from "next/font/google"

export const poppins = Poppins({
    weight: ["400", "500", "600", "700", "800"],
    style: ["normal", "italic"],
    subsets: ["latin"],
    preload: true,
    variable: "--font-poppins",
    display: "swap",
})

export const rubik = Rubik({
    weight: ["400", "500", "600", "700", "800"],
    style: ["normal", "italic"],
    subsets: ["latin"],
    preload: true,
    variable: "--font-rubik",
    display: "swap",
})

export default [poppins.variable, rubik.variable]