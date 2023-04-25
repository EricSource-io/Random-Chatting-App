import ChatLogger from "../chatLogger.js";
import { MESSAGE_TYPES } from "../constants.js";

export default class RoomHandler {
    static rooms = new Map();

    /**
     * Finds the ID of the room that the provided WebSocket is connected to.
     * @param {WebSocket} ws The WebSocket instance to search for.
     * @returns {string|null} The ID of the room or null if not found.
     */
    static getRoomId (ws) {
        for (const [roomId, clients] of this.rooms) {
            // Check if any clients in the current room match the provided WebSocket
            if (clients.some(c => c.ws === ws)) {
                return roomId;
            }
        }
        return null; // if no room is found
    }

    /**
     * Removes a client from a chat room.
     * @param {WebSocket} ws The WebSocket instance of the client to remove.
     * @param {string} roomId The ID of the chat room to remove the client from.
     */
    static leaveChatRoom (ws, roomId = null) {
        // If no roomId is provided, find the room that the provided WebSocket is connected to
        roomId = roomId ? roomId : this.getRoomId(ws);
        
        // If no roomId is found, return
        if (!roomId) return;

        // Get the chat room associated with the provided roomId
        const chatRoom = this.rooms.get(roomId);

        // If no chatRoom is found, return
        if (!chatRoom) return;

        // Find the other client in the chat room
        const otherClient = chatRoom.find(c => c.ws !== ws);

        // If an otherClient is found, notify them that the current client has left the chat room
        if (otherClient) {
            const clientLeftMessage = {
                type: MESSAGE_TYPES.SERVER.CLIENT_LEFT,
                data: {}
            };
            const clientLeftString = JSON.stringify(clientLeftMessage);
            otherClient.ws.send(clientLeftString);
        }

        // Remove the chat room from the rooms Map and close the room in the ChatLogger
        this.rooms.delete(roomId);
        ChatLogger.closeRoom(roomId);
    }

    /**
     * Sends a success message to a client that has successfully joined a chat room.
     * @param {object} client The client object that joined the chat room.
     * @param {object} partner The partner object that the client was paired with.
     * @param {string} roomId The ID of the chat room that the client joined.
     */
    static sendRoomSuccess (client, partner, roomId) {
        const successMessage = {
            type: MESSAGE_TYPES.SERVER.JOIN_ROOM_SUCCESS,
            data: {
                roomId: roomId,
                partner: partner.name ? partner.name : "Stranger"
            }
        };
        const successString = JSON.stringify(successMessage);
        client.ws.send(successString);
    }
}