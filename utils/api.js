// utils/api.js
export const api = {
    post: (url, body) =>
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "same-origin",
            body: JSON.stringify(body),
        }).then(res => res.json()),

    get: (url) =>
        fetch(url, {
            method: "GET",
            credentials: "same-origin",
        }).then(res => res.json()),
};
