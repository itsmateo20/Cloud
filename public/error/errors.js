// errors.js
import en from "./locales/en.json";
import pl from "./locales/pl.json";

const languages = {
    en,
    pl
};

export function getError(code, options = { detailed: false, lang: "en" }) {
    const { detailed = false, lang = "en" } = options;

    const selectedLanguage = languages[lang] || languages.en;

    if (!selectedLanguage[code]) {
        return {
            message: selectedLanguage.unknown_error[detailed ? "long" : "short"],
            code
        };
    }

    return {
        message: detailed ? selectedLanguage[code].long : selectedLanguage[code].short,
        code
    };
}