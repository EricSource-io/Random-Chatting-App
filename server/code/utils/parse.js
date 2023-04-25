/**
 * Safely parse a JSON string, returning the resulting object if successful or null if an error occurred.
 * @param {string} jsonString - The JSON string to parse.
 * @returns {object|null} - The resulting object if parsing was successful, or null if an error occurred.
 */
export function safeParseJSON (jsonString) {
    try {
        const obj = JSON.parse(jsonString);
        return obj;
    } catch (error) {
        return null;
    }
}

