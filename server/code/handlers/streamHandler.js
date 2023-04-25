import ChatLogger from "../chatLogger.js";
import { MESSAGE_DATA_TYPES, MESSAGE_TYPES } from "../constants.js";
import RoomHandler from "./roomHandler.js";


export default class StreamHandler {

    // Static class properties for image chunk size and image size limit
    static imageChunkSize = 1024 * 128; // 128KB
    static imageSizeLimit = 1024 * 1024 * 8; // 8MB

    /**
     * Handles the WebSocket stream event.
     * @param {WebSocket} ws The WebSocket instance.
     * @param {Uint8Array} data The data received in the stream.
     * @param {number} imageSizeLimit The maximum size of the image to be received.
     */
    static onStream (ws, data, imageSizeLimit) {
        // If no input buffer exists, create one
        if (!ws.iBuffer) ws.iBuffer = new Uint8Array();

        // Check if the total size of the input buffer and new data exceeds the image size limit
        const totalBytes = ws.iBuffer.length + data.length;
        if (totalBytes > imageSizeLimit) {
            console.log(`Image size limit exceeded (${totalBytes} bytes).`);
            ws.iBuffer = new Uint8Array();
            return;
        }

        // Combine the input buffer and new data into a new buffer
        const newBuffer = new Uint8Array(totalBytes);
        newBuffer.set(ws.iBuffer);
        newBuffer.set(data, ws.iBuffer.length);
        ws.iBuffer = newBuffer;

        // Send chunks of data until the input buffer is smaller than the chunk size
        while (ws.iBuffer.length >= this.imageChunkSize) {
            const chunk = ws.iBuffer.slice(0, this.imageChunkSize);
            ws.iBuffer = ws.iBuffer.slice(this.imageChunkSize);
            this.sendImageChunk(ws, chunk);
        }

        // If the input buffer size is equal to or larger than the expected content length
        if (ws.iBuffer.length >= ws.stream.contentLength) {
            ws.isStreaming = false;
            console.log(`Received ${ws.iBuffer.byteLength} bytes.`);

            // If the stream is an image stream
            if (ws.stream.type === MESSAGE_TYPES.SERVER.IMAGE_STREAM) {
                const roomId = RoomHandler.getRoomId(ws);

                // If no room ID is found, return
                if (!roomId) {
                    console.log(`No room ID found for client ${ws.id}.`);
                    return;
                }

                const chatRoom = RoomHandler.rooms.get(roomId);

                // If the chat room is not found, return
                if (!chatRoom) {
                    console.log(`Chat room ${roomId} not found.`);
                    return;
                }

                // Send the image stream to the other client in the chat room
                const otherClient = chatRoom.find((c) => c.ws !== ws);
                this.sendImageStream(otherClient.ws, ws.iBuffer.buffer);

                // Log the image message to the chat log
                ChatLogger.addMessage(roomId, ws, MESSAGE_DATA_TYPES.IMAGE, ws.iBuffer.buffer);

                // Reset the input buffer
                ws.iBuffer = new Uint8Array();
            }
        }
    }

    /**
     * Splits a buffer into chunks of a specified size.
     * @param {ArrayBuffer} buffer The buffer to be split into chunks.
     * @returns {Array} An array of chunk arrays.
     */
    static getImageChunks (buffer) {
        let offset = 0;
        let chunks = [];
        const uint8Array = new Uint8Array(buffer);
        while (offset < buffer.byteLength) {
            const end = Math.min(offset + this.imageChunkSize, buffer.byteLength);
            const chunk = uint8Array.slice(offset, end);
            const chunkArray = Array.from(chunk);
            chunks.push(chunkArray);
            offset = end;
        }
        return chunks;
    }

    /**
    * Sends an image stream to a WebSocket.
    * @param {WebSocket} ws The WebSocket to send the image stream to.
    * @param {ArrayBuffer} buffer The buffer containing the image data.
    */

    static sendImageStream (ws, buffer) {
         // Create a stream header and send it to the WebSocket
        const streamHeader = {
            type: MESSAGE_TYPES.CHAT_MESSAGE,
            data: {
                type: MESSAGE_DATA_TYPES.IMAGE_STREAM_HEADER
            }
        };
        const headerString = JSON.stringify(streamHeader);
        ws.send(headerString);

         // Send the image data in chunks
        const chunks = this.getImageChunks(buffer);
        chunks.forEach(chunk => {
            const chunkMessage = {
                type: MESSAGE_TYPES.CHAT_MESSAGE,
                data: {
                    type: MESSAGE_DATA_TYPES.IMAGE_STREAM_CHUNK,
                    chunk: chunk
                }
            };
            const chunkString = JSON.stringify(chunkMessage);
            ws.send(chunkString);
        });
        
        // Send the end of stream message
        const finalMessage = {
            type: MESSAGE_TYPES.CHAT_MESSAGE,
            data: {
                type: MESSAGE_DATA_TYPES.IMAGE_STREAM_END
            }
        };
        const finalString = JSON.stringify(finalMessage);
        ws.send(finalString);
    }
}


