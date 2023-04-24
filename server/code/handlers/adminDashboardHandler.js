import { MESSAGE_TYPES, MESSAGE_DATA_TYPES, ERROR_TYPES } from "../constants.js";
import RoomHandler from "./roomHandler.js";

export default class AdminDashboard {

    static ws = null; // Admin 
    static stats = {
        clients: 0,
        messages: 0,
        images: 0
    };
    static isAuthValid (auth) {
        return auth == "AWJD@#!KJASD!#MK" // ! Just for testing
    }

    static sendAuthSuccess () {
        if(!this.ws) return; 
        const successMessage = {
            type: MESSAGE_TYPES.SERVER.AUTHENTICATION_SUCCESS,
        };
        const successString = JSON.stringify(successMessage);
        this.ws.send(successString);
    }

    static sendStats () {
        if(!this.ws) return; 
        const statsMessage = {
            type: MESSAGE_TYPES.SERVER.ADMIN_DASHBOARD,
            data: {
                type: MESSAGE_DATA_TYPES.STATS,
                clients: this.stats.clients,
                rooms: RoomHandler.rooms.size,
                messages: this.stats.messages,
                images: this.stats.images
            }
        }
        const statsString = JSON.stringify(statsMessage);
        this.ws.send(statsString);
    }
}
