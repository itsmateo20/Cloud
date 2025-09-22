// app/global-error.js

"use client";

import errorStyles from "@/public/styles/error.module.css";

export default function GlobalError({ error, reset }) {
    return (
        <main className={errorStyles.fourofour}>
            <h1>Something went wrong.</h1>
            <p>{error?.message || 'An unexpected error occurred.'}</p>
            <button className={errorStyles.button} onClick={() => reset()}>
                Try again
            </button>
        </main>
    );
}
