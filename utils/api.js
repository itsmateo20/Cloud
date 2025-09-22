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
        return {
            success: false,
            code: 'invalid_json',
            message: 'Server returned invalid JSON',
            rawResponse: text
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

async function handleBlobResponse(response) {
    if (!response.ok) {
        try {
            const errorData = await safeJsonParse(response);
            return { success: false, ...errorData };
        } catch {
            return {
                success: false,
                code: `http_${response.status}`,
                message: `HTTP ${response.status}: ${response.statusText}`
            };
        }
    }

    const blob = await response.blob();
    return { success: true, blob };
}

async function makeRequest(method, url, body = null, customHeaders = null) {
    try {
        const baseUrl = await getBaseUrl();
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

        const isFormData = body instanceof FormData;
        const isBlob = body instanceof Blob;

        let headers = { ...customHeaders };
        let processedBody = body;

        if (body && !isFormData && !isBlob && !headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
            processedBody = JSON.stringify(body);
        }

        const response = await fetch(fullUrl, {
            method,
            headers: Object.keys(headers).length > 0 ? headers : undefined,
            credentials: "same-origin",
            body: processedBody,
        });

        return response;
    } catch (error) {
        throw {
            success: false,
            code: 'network_error',
            message: error.message || 'Network request failed',
            error: error.name
        };
    }
}

export const api = {
    post: async (url, body = null, headers = null) => {
        try {
            const response = await makeRequest('POST', url, body, headers);
            return await handleResponse(response);
        } catch (error) {
            return error;
        }
    },

    get: async (url, headers = null) => {
        try {
            const response = await makeRequest('GET', url, null, headers);
            return await handleResponse(response);
        } catch (error) {
            return error;
        }
    },

    put: async (url, body = null, headers = null) => {
        try {
            const response = await makeRequest('PUT', url, body, headers);
            return await handleResponse(response);
        } catch (error) {
            return error;
        }
    },

    patch: async (url, body = null, headers = null) => {
        try {
            const response = await makeRequest('PATCH', url, body, headers);
            return await handleResponse(response);
        } catch (error) {
            return error;
        }
    },

    delete: async (url, headers = null) => {
        try {
            const response = await makeRequest('DELETE', url, null, headers);
            return await handleResponse(response);
        } catch (error) {
            return error;
        }
    },

    upload: async (url, formData, headers = null) => {
        try {
            const response = await makeRequest('POST', url, formData, headers);
            return await handleResponse(response);
        } catch (error) {
            return error;
        }
    },

    downloadBlob: async (url, body = null, headers = null) => {
        try {
            const method = body ? 'POST' : 'GET';
            const response = await makeRequest(method, url, body, headers);
            return await handleBlobResponse(response);
        } catch (error) {
            return error;
        }
    },

    raw: async (method, url, body = null, headers = null) => {
        try {
            return await makeRequest(method, url, body, headers);
        } catch (error) {
            throw error;
        }
    }
};
