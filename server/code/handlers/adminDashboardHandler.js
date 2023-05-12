import { MESSAGE_TYPES, MESSAGE_DATA_TYPES, ERROR_TYPES } from '../constants.js';
import RoomHandler from './roomHandler.js';


export default class AdminDashboard {

    static ws = null; // WebSocket instance for the admin
    static stats = { clients: 0, messages: 0, images: 0 }; // Object to keep track of statistics

    // Function to check if the authentication string is valid
    static isAuthValid (auth) {
        return auth == process.env.WADDLETALK_API_KEY;
    }

    // Function to send an authentication success message to the admin
    static sendAuthSuccess () {
        if (!this.ws) return; // If there is no WebSocket instance, return
        const successMessage = {
            type: MESSAGE_TYPES.SERVER.AUTHENTICATION_SUCCESS,
        };
        const successString = JSON.stringify(successMessage);
        this.ws.send(successString);
    }

    // Function to send the statistics to the admin
    static sendStats () {
        if (!this.ws) return; // If there is no WebSocket instance, return
        const statsMessage = {
            type: MESSAGE_TYPES.SERVER.ADMIN_DASHBOARD,
            data: {
                type: MESSAGE_DATA_TYPES.STATS,
                clients: this.stats.clients, // Set the number of clients
                rooms: RoomHandler.rooms.size, // Set the number of rooms
                messages: this.stats.messages, // Set the number of messages
                images: this.stats.images // Set the number of images
            }
        }
        const statsString = JSON.stringify(statsMessage);
        this.ws.send(statsString);
    }
}
