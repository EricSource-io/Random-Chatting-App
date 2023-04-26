import { MESSAGE_TYPES, MESSAGE_DATA_TYPES, ERROR_TYPES, PORT } from "./constants.js";
import ip from "ip";
import { WebSocketServer } from 'ws';
import { randomUUID } from "crypto";
import { isBucketEmpty, addTokensAtRate, clearTokenBucketInterval } from "./utils/limiter.js";
import { safeParseJSON } from './utils/parse.js';
import StreamHandler from "./handlers/streamHandler.js";
import RoomHandler from "./handlers/roomHandler.js";
import AdminDashboard from "./handlers/adminDashboardHandler.js";
import ChatLogger from "./chatLogger.js";

ChatLogger.config.logging = false;

// Creating a new websocket server
console.log(PORT)
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
  }, 5000); // send a ping every 5 seconds
  return interval;
}



// Creating connection using WebSocket
wss.on("connection", ws => {
  // Set up a heartbeat interval for the WebSocket connection
  const heartbeatInterval = heartbeat(ws);
  console.log(`Client connected from ${ws._socket.remoteAddress}`);

  // Initialize streaming related properties for the WebSocket
  ws.isStreaming = false;
  ws.stream = { type: "", contentLength: 0 };

  // Add token bucket functionality to the WebSocket
  addTokensAtRate(ws);

  // Handle incoming messages from the WebSocket
  ws.on("message", async buffer => {
    if (ws.isStreaming) {
      console.log("stream");
      StreamHandler.onStream(ws, buffer);
      return;
    }
    // Parse the incoming JSON message
    const event = safeParseJSON(buffer);
    if (!event) return; // Error parsing JSON
    console.log(event.type)

    // Check if the WebSocket's token bucket is empty
    if (isBucketEmpty(ws)) {

      // Send an error message to the WebSocket if the token bucket is empty
      const errorMessage = JSON.stringify({
        type: "ERROR",
        data: {
          type: ERROR_TYPES.RATE_LIMIT_EXCEEDED
        }
      });
      const errorString = JSON.stringify(errorMessage);
      ws.emit(errorString);

      sendError(ws, ERROR_TYPES.RATE_LIMIT_EXCEEDED);
      return;
    }

    // Decrement the token bucket by one for each message received
    ws.tokenBucket.tokens -= 1;

    // Handle the incoming message from an admin WebSocket
    if (AdminDashboard.ws === ws) {
      if (event.type === MESSAGE_TYPES.ADMIN.GET_STATS) {
        // Update the number of connected clients before sending stats
        AdminDashboard.stats.clients = wss.clients.size;
        AdminDashboard.sendStats();
        return;
      }
    }

    const TYPE = MESSAGE_TYPES.CLIENT;

    switch (event.type) {
      case TYPE.AUTHENTICATION:
        if(AdminDashboard.isAuthValid(event.data.auth)){
          AdminDashboard.ws = ws;
          AdminDashboard.sendAuthSuccess();
        }
      break;
      case TYPE.JOIN_WAITING_LIST:
        // Join client to the waiting list
        joinWaitingList(ws, event.data);
        break;
      case TYPE.LEAVE_WAITING_LIST:
        // Remove client from the waiting list
        leaveWaitingList(ws);
        break;
      case TYPE.LEAVE_ROOM:
        // Client leaves the chat room
        RoomHandler.leaveChatRoom(ws, event.data.roomId);
        break;
      case MESSAGE_TYPES.CHAT_MESSAGE:
        // Handle incoming chat messages
        const roomId = event.data.roomId;
        const chatRoom = RoomHandler.rooms.get(roomId);

        if (!chatRoom) {
          //! No chat room associated with this roomId
          return;
        }
        const otherClient = chatRoom.find(c => c.ws !== ws);

        if (!otherClient) {
          // Client not found in the chat room, leave the chat room
          RoomHandler.leaveChatRoom(ws, roomId);
          return;
        }

        // Check if the chat message is an image stream
        if (event.data.type === MESSAGE_DATA_TYPES.IMAGE_STREAM_HEADER) {

          const contentLength = event.data.contentLength;
          console.log(contentLength, StreamHandler.imageSizeLimit)

          if (contentLength > StreamHandler.imageSizeLimit) {
            // Image size exceeds limit, ignore the message
            // The Websocket can't handle sending a stream and receiving a message at the same time
            // Sending image as a series of chunks can fix this (in _sendImage())
            // *sendError(ws, ERROR_TYPES.IMAGE_SIZE_LIMIT_EXCEEDED);
            return;
          }

          // Increment the image count and set stream data
          AdminDashboard.stats.images += 1;
          ws.isStreaming = true;
          ws.stream = {
            type: MESSAGE_TYPES.SERVER.IMAGE_STREAM,
            contentLength: contentLength
          }
        } else {
          // Increment the message count and send the chat message as usual
          AdminDashboard.stats.messages += 1;
          sendChatMessage(otherClient.ws, event.data.content);
          ChatLogger.addMessage(roomId, ws, MESSAGE_DATA_TYPES.TEXT, event.data.content);
        }
        break;
      // Unknown message type, log it for debugging
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
    clearTokenBucketInterval(ws.tokenBucket.interval);
    clearInterval(heartbeatInterval);
  });

  // handling client connection error
  ws.onerror = () => {
    console.log("Some Error occurred!");
    sendError(ws, ERROR_TYPES.INTERNAL_SERVER_ERROR);
  }
});

wss.on("error", error => console.log(`Some Error occurred! ${error}`))


//console.log(`The WebSocket server is running on ws://${ip.address()}:${port}`);




