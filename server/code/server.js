<<<<<<< HEAD
import { MESSAGE_TYPES, MESSAGE_DATA_TYPES, ERROR_TYPES, PORT } from "./constants.js";
=======
import ip from "ip";
import { WebSocketServer } from 'ws';
import { randomUUID } from "crypto";
import { MESSAGE_TYPES, MESSAGE_DATA_TYPES, ERROR_TYPES } from "./constants.js";
import { isBucketEmpty, addTokensAtRate } from "./utils/limiter.js";
import { safeParseJSON } from './utils/parse.js';
>>>>>>> b1c0c61cf3fb70af133f013597719c62344f843d
import StreamHandler from "./handlers/streamHandler.js";
import RoomHandler from "./handlers/roomHandler.js";
import AdminDashboard from "./handlers/adminDashboardHandler.js";
import ChatLogger from "./chatLogger.js";

ChatLogger.config.logging = false;

// Creating a new websocket server
const wss = new WebSocketServer({ port: PORT });

const waitingClients = [];

function joinWaitingList (ws, data) {
  const client = {
    ws: ws,
    name: data.username.trim() !== '' ? data.username : "Stranger"
  };
  waitingClients.push(client);

  // Check if there are enough clients in the waiting list to form a chat room
  if (waitingClients.length >= 2) {
    const client1 = waitingClients.pop();
    const client2 = waitingClients.pop();

    // Create a new chat room and assign the clients to it
    const chatRoomId = randomUUID();
    RoomHandler.rooms.set(chatRoomId, [client1, client2]);

    // Notify the clients that they have joined a chat room
    RoomHandler.sendRoomSuccess(client1, client2, chatRoomId);
    RoomHandler.sendRoomSuccess(client2, client1, chatRoomId);

    ChatLogger.addRoom(chatRoomId, client1, client2);
  }
}

function leaveWaitingList (ws) {
  for (let i = 0; i < waitingClients.length; i++) {
    if (waitingClients[i].ws === ws) {
      waitingClients.splice(i, 1);
      break;
    }
  }
}

function sendChatMessage (ws, content) {
  const chatMessage = JSON.stringify({
    type: MESSAGE_TYPES.CHAT_MESSAGE,
    data: {
      type: MESSAGE_DATA_TYPES.TEXT, // text
      content: content  //  String
    }
  });
  ws.send(chatMessage);
}

function sendError (ws, errorType, info = null) {
  const errorMessage = {
    type: "ERROR",
    error: { type: errorType, info: info },
  };
  const errorString = JSON.stringify(errorMessage);
  ws.send(errorString);
}

function heartbeat (ws) {
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);
  const interval = setInterval(function ping () {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping('', false);
  }, 3000); // send a ping every 3 seconds
  //on message from client

  return interval;
}



// Creating connection using websocket
wss.on("connection", ws => {
  const interval = heartbeat(ws);
  console.log(`Client connected from ${ws._socket.remoteAddress}`);

  ws.isStreaming = false;
  ws.stream = {
    type: "",
    contentLength: 0
  };

  addTokensAtRate(ws);

  ws.on("message", async buffer => {
    if (ws.isStreaming) {
      console.log("stream");
      StreamHandler.onStream(ws, buffer);
      return;
    }

    const event = safeParseJSON(buffer);
    if (!event) return; // Error parsing JSON
    console.log(event.type)
    if (isBucketEmpty(ws)) {
<<<<<<< HEAD
      const errorMessage = JSON.stringify({
        type: "ERROR",
        data: {
          type: ERROR_TYPES.RATE_LIMIT_EXCEEDED
        }
      });
      const errorString = JSON.stringify(errorMessage);
      ws.emit(errorString);
=======
      sendError(ws, ERROR_TYPES.RATE_LIMIT_EXCEEDED);
>>>>>>> b1c0c61cf3fb70af133f013597719c62344f843d
      return;
    }
    ws.tokenBucket -= 1;



    if (AdminDashboard.ws === ws) {
      if (event.type === MESSAGE_TYPES.ADMIN.GET_STATS) {
        AdminDashboard.stats.clients = wss.clients.size; // Update client count before sending stats
        AdminDashboard.sendStats();
        return;
      }
    }

    const TYPE = MESSAGE_TYPES.CLIENT;

    switch (event.type) {
<<<<<<< HEAD

=======
      case TYPE.AUTHENTICATION:
        // Currently only accepting auth as admin
        const auth = event.data.auth;
        const isValid = AdminDashboard.isAuthValid(auth);
        if (isValid) {
          AdminDashboard.ws = ws;
          AdminDashboard.sendAuthSuccess();
        }
        break;
      // -----------------------------------------------
>>>>>>> b1c0c61cf3fb70af133f013597719c62344f843d
      case TYPE.JOIN_WAITING_LIST:
        joinWaitingList(ws, event.data);
        break;
      // -----------------------------------------------
      case TYPE.LEAVE_WAITING_LIST:
        leaveWaitingList(ws);
        break;
      // -----------------------------------------------
      case TYPE.LEAVE_ROOM:
        RoomHandler.leaveChatRoom(ws, event.data.roomId);
        break;
      // -----------------------------------------------
      case MESSAGE_TYPES.CHAT_MESSAGE:
        const roomId = event.data.roomId;
        const chatRoom = RoomHandler.rooms.get(roomId);
        if (!chatRoom) {
          //! No chat room associated with this roomId
          return;
        }
        const otherClient = chatRoom.find(c => c.ws !== ws);
        if (!otherClient) {
          RoomHandler.leaveChatRoom(ws, roomId);
          return;
        }
        // Check if the chat message is an image stream
        if (event.data.type === MESSAGE_DATA_TYPES.IMAGE_STREAM_HEADER) {

          const contentLength = event.data.contentLength;
          console.log(contentLength, StreamHandler.imageSizeLimit)
          if (contentLength > StreamHandler.imageSizeLimit) {
            //sendError(ws, ERROR_TYPES.IMAGE_SIZE_LIMIT_EXCEEDED);
             //! Somehow the Websocket cant handle sending a stream and receiving a message at the same time
             //? Can be fixed by sending image as a series of chunks! (_sendImage())
             //! Currently the app checks if the image size is accepted locally inside _sendImage and here it just gets ignored without sending a warning
            return;
          }

          AdminDashboard.stats.images += 1;
          ws.isStreaming = true;
          ws.stream = {
            type: MESSAGE_TYPES.SERVER.IMAGE_STREAM,
            contentLength: contentLength
          }
        } else {
          AdminDashboard.stats.messages += 1;
          // If the chat message is not an image stream, send it as usual
          sendChatMessage(otherClient.ws, event.data.content);
          ChatLogger.addMessage(roomId, ws, MESSAGE_DATA_TYPES.TEXT, event.data.content);
        }
        break;
      // -----------------------------------------------
      default: console.log(event);
    }
  });

  // handling what to do when clients disconnects from server
  ws.on("close", () => {
    const index = waitingClients.findIndex(c => c.ws === ws);
    if (index !== -1) {
      // If the disconnected client was in the waiting list, remove it from the list and return.
      waitingClients.splice(index, 1);
      return;
    }
    // If the disconnected client was in a chat room, remove the chat room and notify the other client.
    RoomHandler.leaveChatRoom(ws);
    clearInterval(interval);
  });

  // handling client connection error
  ws.onerror = () => {
    console.log("Some Error occurred!");
    sendError(ws, ERROR_TYPES.INTERNAL_SERVER_ERROR);
  }
});

wss.on("error", error => console.log(`Some Error occurred! ${error}`))


console.log(`The WebSocket server is running on ws://${ip.address()}:${port}`);




