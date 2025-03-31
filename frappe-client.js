const axios = require('axios');

async function frappeRequest({ url, method, apiKey, apiSecret, data }) {
    try {
        const response = await axios({
            method,
            url,
            data,
            headers: {
                'Authorization': `token ${apiKey}:${apiSecret}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        return response;
    } catch (error) {
        if (error.response) {
            throw new Error(`Frappe Error: ${error.response.data.message || error.response.statusText}`);
        } else {
            throw new Error(`Network Error: ${error.message}`);
        }
    }
}

module.exports = { frappeRequest };