import fs from "fs";
import { MESSAGE_DATA_TYPES } from "./constants.js";

export default class ChatLogger {
    static config = {
        logging: false,
        savePath: "./logs",
        delimiter: ';',
        keepText: false,
        keepImage: false,
        //timestamps: true,
        //roomID: true,
    }

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



    static addRoom (roomID, client1, client2) {
        if (!this.config.logging) return;
        if (this.chatRooms.has(roomID)) return;
        const chatRoom = {
            clients: [client1, client2],
            messages: []
        }
        this.chatRooms.set(roomID, chatRoom);
    }

    static addMessage (roomID, ws, dataType, content) {
        if (!this.config.logging) return;
        if (!this.chatRooms.has(roomID)) return;
        if (dataType === MESSAGE_DATA_TYPES.TEXT && !this.config.keepText) return;
        if (dataType === MESSAGE_DATA_TYPES.IMAGE && !this.config.keepImage) return;

        let chatRoom = this.chatRooms.get(roomID);
        const sender = chatRoom.clients.find(c => c.ws == ws).name;
        const message = { sender: sender, type: dataType, content: content };
        chatRoom.messages.push(message);
        this.chatRooms.set(roomID, chatRoom);


    }

    static closeRoom (roomID) {
        if (!this.config.logging) return;
        if (!this.chatRooms.has(roomID)) return;

        if (false /*When chat was reported*/) { 
            const chatRoom = this.chatRooms.get(roomID);

            let data = "";
            const d = this.config.delimiter;
            chatRoom.messages.forEach(message => {
                const sender = message.sender.replace(d, "");
                let content = message.content;
                if (message.type === MESSAGE_DATA_TYPES.TEXT) {
                    content = content.replace(d, "");
                }
                const type = message.type;
                data += `"${sender}"${d} "${type}"${d} ${d}"${content}"}\n`;
            });

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