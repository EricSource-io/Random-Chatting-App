const chatLog = document.getElementById("chat-log");
const sendBtn = document.getElementById("send");
const cancelBtn = document.getElementById("cancel");
const input = document.getElementById("input");
const ws = new WebSocket("ws://localhost:6565");
//const ws = new WebSocket("ws://192.168.2.182:6565");
let imageStream = {
  contentLength: 0,
  data: [] // chunks
}
const user = "Eric";

let strangerName = "Stranger";
let roomId;
ws.onopen = (event) => {
  console.log("connected");
  const payload = {
    type: "JOIN_WAITING_LIST",
    data: { username: user }
  };
  ws.send(JSON.stringify(payload));
  const messageElement = document.createElement("div");
  messageElement.textContent = "Searching...";
  chatLog.appendChild(messageElement);

  sendBtn.addEventListener("click", () => {
    if (!roomId || !input.value) return;
    const payload = {
      type: "CHAT_MESSAGE",
      data: {
        type: "text",
        content: input.value,
        roomId: roomId
      },
    };
    const messageElement = document.createElement("div");
    messageElement.textContent = "YOU: " + input.value;
    chatLog.appendChild(messageElement);
    ws.send(JSON.stringify(payload));
    input.value = null;

  });

  cancelBtn.addEventListener("click", () => {
    if (!roomId) return;
    const payload = {
      type: "LEAVE_ROOM",
      data: {
        roomId: roomId
      },
    };
    const messageElement = document.createElement("div");
    messageElement.textContent = "You left the room";
    chatLog.appendChild(messageElement);
    ws.send(JSON.stringify(payload));
    input.value = null;

  });
};

ws.onmessage = (buffer) => {
  const event = JSON.parse(buffer.data);
  console.log(event, "EVENT");
  if (event.type == "CHAT_MESSAGE") {
    switch (event.data.type) {
      case "TEXT":
        const messageElement = document.createElement("div");
        messageElement.textContent = strangerName + ": " + event.data.content;
        chatLog.appendChild(messageElement);
        break;
      case "IMAGE_STREAM_HEADER":
        imageStream.contentLength = event.data.contentLength
        imageStream.data = [];
        break;
      case "IMAGE_STREAM_CHUNK":
        const chunk = new Uint8Array(event.data.chunk)
        imageStream.data.push(chunk);
        break;
      case "IMAGE_STREAM_END":
        console.log(imageStream.data)
        const blob = new Blob(imageStream.data, { type: 'image/jpeg' });
        const imageUrl = URL.createObjectURL(blob);
        const imgElement = document.createElement("img");
        imgElement.src = imageUrl;
        imgElement.height = 300;
        chatLog.appendChild(imgElement);
        break; 
        default:
        console.error("Unknown message type received: ", data.type);
    }
  }

  if (event.type == "JOIN_ROOM_SUCCESS") {
    roomId = event.data.roomId;
    strangerName = event.data.partner;
    const messageElement = document.createElement("div");
    messageElement.textContent = "Joined room";
    chatLog.appendChild(messageElement);
  }
  if (event.type == "CLIENT_LEFT") {
    chatLog.innerHTML = null;
    roomId = null;
    const messageElement = document.createElement("div");
    messageElement.textContent = "Client left";
    chatLog.appendChild(messageElement);

    const payload = {
      type: "JOIN_WAITING_LIST",
      data: { username: user }
    };
    ws.send(JSON.stringify(payload));
    const messageElement2 = document.createElement("div");
    messageElement2.textContent = "Searching...";
    chatLog.appendChild(messageElement2);
  }
};


