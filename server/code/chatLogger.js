import fs from 'fs';
import { MESSAGE_DATA_TYPES } from './constants.js';

export default class ChatLogger {
    // Set up the default configuration options for the chat logger
    static config = {
        logging: false,
        savePath: './logs',
        delimiter: ';',
        keepText: false,
        keepImage: false,
        //timestamps: true,
        //roomID: true,
    }

    // Define a Map to store the chat rooms and their messages
    static chatRooms = new Map();

    /*
    key => roomID
    value => chatRoom = {
        user1: string
        user2: string
        messages: array
    }
    message = {from: clientName, type: , content}
    */

    // Add a new chat room to the chatRooms Map
    static addRoom (roomID, client1, client2) {
        // Check if logging is enabled and if the chat room already exists
        if (!this.config.logging || this.chatRooms.has(roomID)) return;

        // Create a new chatRoom object with the two clients and an empty array for messages
        const chatRoom = {
            clients: [client1, client2],
            messages: []
        }

        // Add the new chatRoom to the chatRooms Map
        this.chatRooms.set(roomID, chatRoom);
    }

    // Add a new chat message to the specified chat room
    static addMessage (roomID, ws, dataType, content) {
        // Check if logging is enabled and if the chat room exists
        if (!this.config.logging || !this.chatRooms.has(roomID))  return;

        // Check if the message type should be kept based on the configuration options
        if (dataType === MESSAGE_DATA_TYPES.TEXT && !this.config.keepText) return;
        if (dataType === MESSAGE_DATA_TYPES.IMAGE && !this.config.keepImage) return;

        // Get the chat room and the sender's name from the WebSocket object
        let chatRoom = this.chatRooms.get(roomID);
        const sender = chatRoom.clients.find(c => c.ws == ws).name;

        // Create a new message object and add it to the chatRoom messages array
        const message = { sender: sender, type: dataType, content: content };
        chatRoom.messages.push(message);
        this.chatRooms.set(roomID, chatRoom);
    }

    // Close a chat room and optionally save the chat log as a CSV file
    static closeRoom (roomID) {
        // Check if logging is enabled and if the chat room exists
        if (!this.config.logging || !this.chatRooms.has(roomID)) return;

        // Check if the chat was reported (placeholder code)
        if (false /*When chat was reported*/) {
            // Get the chat room and create a CSV string of its messages
            const chatRoom = this.chatRooms.get(roomID);
            let data = '';
            const d = this.config.delimiter;
            chatRoom.messages.forEach(message => {
                const sender = message.sender.replace(d, '');
                let content = message.content;
                if (message.type === MESSAGE_DATA_TYPES.TEXT) {
                    content = content.replace(d, '');
                }
                const type = message.type;
                data += `'${sender}'${d} '${type}'${d} ${d}'${content}'}\n`;
            });
            
            // Save the chat log to a CSV file if there are any messages
            if (data.length > 0) {
                const fileName = `chatlog_${roomID}.csv`;
                const filePath = `${this.config.savePath}/${fileName}`;

                fs.writeFile(filePath, data, (error) => {
                    if (error) throw error;
                    console.log(`Chat log saved to ${filePath}`);
                });
            }
        }

        this.chatRooms.delete(roomID);
    }
}   