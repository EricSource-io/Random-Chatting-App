/**
 * Adds tokens at a given rate to a WebSocket's token bucket.
 * @param {WebSocket} ws The WebSocket instance to add tokens to.
 * @param {number} tokensToAdd The number of tokens to add at each interval.
 * @param {number} maxTokens The maximum number of tokens allowed in the bucket.
 * @param {number} tokenInterval The interval, in milliseconds, at which to add tokens.
 */
export function addTokensAtRate (ws, tokensToAdd = 1, maxTokens = 5, tokenInterval = 1000) {
    // Initialize the token bucket with the maximum number of tokens.
    ws.tokenBucket = {
        tokens: maxTokens, 
        // Set up an interval to add tokens to the bucket.
        interval: setInterval(() => {
            // Increment the number of tokens in the bucket, up to the maximum.
            ws.tokenBucket.tokens = Math.min(ws.tokenBucket.tokens + tokensToAdd, maxTokens);
        }, tokenInterval)
    };
}

/**
 * Clears the interval responsible for adding tokens to a WebSocket's token bucket.
 * @param {WebSocket} ws The WebSocket instance to remove the interval from.
 */
export function clearTokenBucketInterval(interval) {
    clearInterval(interval);
}

/**
 * Determines whether a WebSocket's token bucket is empty.
 * @param {WebSocket} ws The WebSocket instance to check.
 * @returns {boolean} True if the token bucket is empty, false otherwise.
 */
export function isBucketEmpty (ws) {
    return ws.tokenBucket.tokens <= 0;
}