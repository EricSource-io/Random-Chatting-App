export function addTokensAtRate (ws, tokensToAdd = 1, maxTokens = 5, tokenInterval = 1000) {
    ws.tokenBucket = maxTokens;
    setInterval(() => {
        ws.tokenBucket = Math.min(ws.tokenBucket + tokensToAdd, maxTokens);
    }, tokenInterval);
}

export function isBucketEmpty(ws){
    return ws.tokenBucket <= 0;
}