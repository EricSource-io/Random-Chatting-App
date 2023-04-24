import ChatLogger from "../chatLogger.js";
import { MESSAGE_TYPES } from "../constants.js";

export default class RoomHandler {
    static rooms = new Map();
    static getRoomId (ws) {
        for (const [roomId, clients] of this.rooms) {
            if (clients.some(c => c.ws === ws)) {
                return roomId;
            }
        }
        return null; // if no room is found
    }
    static leaveChatRoom (ws, roomId = null) {
        roomId = roomId ? roomId : this.getRoomId(ws);
        
        if (!roomId) return;
        const chatRoom = this.rooms.get(roomId);

        if (!chatRoom) return;

        const otherClient = chatRoom.find(c => c.ws !== ws);
        if (otherClient) {
            const clientLeftMessage = {
                type: MESSAGE_TYPES.SERVER.CLIENT_LEFT,
                data: {}
            };
            const clientLeftString = JSON.stringify(clientLeftMessage);
            otherClient.ws.send(clientLeftString);
        }
        this.rooms.delete(roomId);
        ChatLogger.closeRoom(roomId);
    }
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