// utils/api.js

import { getSiteUrl } from "@/lib/getSiteUrl";

async function getBaseUrl() {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }

    return await getSiteUrl();
}


async function safeJsonParse(response) {
    const text = await response.text();


    if (!text) {
        return {
            success: false,
            code: 'empty_response',
            message: 'Server returned empty response'
        };
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        console.error('Failed to parse JSON response:', text);
        return {
            success: false,
            code: 'invalid_json',
            message: 'Server returned invalid JSON',
            rawResponse: text.substring(0, 200) // First 200 chars for debugging
        };
    }
}


async function handleResponse(response) {

    if (!response.ok) {
        let errorData;
        try {
            errorData = await safeJsonParse(response);
        } catch {
            errorData = {
                success: false,
                code: `http_${response.status}`,
                message: `HTTP ${response.status}: ${response.statusText}`
            };
        }


        return errorData;
    }

    return await safeJsonParse(response);
}

export const api = {
    post: async (url, body) => {
        try {
            const baseUrl = await getBaseUrl();
            const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

            const response = await fetch(fullUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(body),
            });

            return await handleResponse(response);
        } catch (error) {
            console.error('API POST request failed:', error);
            return {
                success: false,
                code: 'network_error',
                message: error.message || 'Network request failed',
                error: error.name
            };
        }
    },

    get: async (url, options = {}) => {
        try {
            const baseUrl = await getBaseUrl();
            const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

            const response = await fetch(fullUrl, {
                method: "GET",
                credentials: "same-origin",
                ...options
            });

            return await handleResponse(response);
        } catch (error) {
            console.error('API GET request failed:', error);
            return {
                success: false,
                code: 'network_error',
                message: error.message || 'Network request failed',
                error: error.name
            };
        }
    },

    put: async (url, body) => {
        try {
            const baseUrl = await getBaseUrl();
            const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

            const response = await fetch(fullUrl, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify(body),
            });

            return await handleResponse(response);
        } catch (error) {
            console.error('API PUT request failed:', error);
            return {
                success: false,
                code: 'network_error',
                message: error.message || 'Network request failed',
                error: error.name
            };
        }
    },

    delete: async (url) => {
        try {
            const baseUrl = await getBaseUrl();
            const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

            const response = await fetch(fullUrl, {
                method: "DELETE",
                credentials: "same-origin",
            });

            return await handleResponse(response);
        } catch (error) {
            console.error('API DELETE request failed:', error);
            return {
                success: false,
                code: 'network_error',
                message: error.message || 'Network request failed',
                error: error.name
            };
        }
    }
};
