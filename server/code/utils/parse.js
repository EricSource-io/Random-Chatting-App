export function safeParseJSON (jsonString) {
    try {
        const obj = JSON.parse(jsonString);
        return obj;
    } catch (error) {
        return null;
    }
}

