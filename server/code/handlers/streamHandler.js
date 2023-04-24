import ChatLogger from "../chatLogger.js";
import { MESSAGE_DATA_TYPES, MESSAGE_TYPES } from "../constants.js";
import RoomHandler from "./roomHandler.js";
export default class StreamHandler {

    static imageChunkSize = 1024 * 128; // 128KB
    static imageSizeLimit = 1024 * 1024 * 8; // 8MB

    static onStream (ws, data) {
        if (!ws.iBuffer) {
            ws.iBuffer = new Uint8Array();
        }
        const totalBytes = ws.iBuffer.length + data.length;

        const newBuffer = new Uint8Array(totalBytes);
        newBuffer.set(ws.iBuffer);
        newBuffer.set(data, ws.iBuffer.length);
        ws.iBuffer = newBuffer;

        //  console.log(data.length, this.buffer.length, ws.stream.contentLength);

        if (ws.iBuffer.length >= ws.stream.contentLength) {
            ws.isStreaming = false;
            console.log(`Received ${ ws.iBuffer.byteLength} bytes.`);
            if (ws.stream.type === MESSAGE_TYPES.SERVER.IMAGE_STREAM) {
                const roomId = RoomHandler.getRoomId(ws);
                if (!roomId) return; //! roomId null
                const chatRoom = RoomHandler.rooms.get(roomId);
                if (!chatRoom) return; // ! chatRoom null
                const otherClient = chatRoom.find(c => c.ws != ws);
                this.sendImageStream(otherClient.ws, ws.iBuffer.buffer);
                console.log(new Uint8Array(ws.iBuffer.buffer));
                ChatLogger.addMessage(roomId, ws, MESSAGE_DATA_TYPES.IMAGE, ws.iBuffer.buffer);
                ws.iBuffer = new Uint8Array(); // Reset mBuffer
            }
        }
    }

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

    static sendImageStream (ws, buffer) {
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


