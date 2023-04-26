 
const chats = document.getElementById("chats");
const reports = document.getElementById("reports");
const stats = {
    clients: document.getElementById("client-stats").querySelector(".data"),
    rooms: document.getElementById("room-stats").querySelector(".data"),
    messages: document.getElementById("message-stats").querySelector(".data"),
    images: document.getElementById("image-stats").querySelector(".data"),
}
const updateButton = document.getElementById("update-button");

const statsList = document.getElementById("stats");


const ws = new WebSocket("ws://localhost:6565");
//const ws = new WebSocket("ws://192.168.2.182:6565");
let isAuth = false;

const request = {
  stats: () => {
    ws.send(JSON.stringify({type: "GET_STATS"}));
    },
  chats: () => {
    ws.send(JSON.stringify({type: "GET_CHATS"}));
  }
};

ws.onopen = () => {
    const authMessage = {
        type: "AUTHENTICATION",
        data: {
            auth: "AWJD@#!KJASD!#MK",
        }
    }
    const authString = JSON.stringify(authMessage);
    ws.send(authString);
}

ws.onmessage = (buffer) => {
    const event = JSON.parse(buffer.data);
    console.log(event)
    switch (event.type) {
        case "AUTHENTICATION_SUCCESS":
            isAuth = true;
            request.stats();
            break;
        case "ADMIN_DASHBOARD":
            if (event.data.type === "STATS") {

                stats.clients.innerText = event.data.clients || 0;
                stats.rooms.innerText = event.data.rooms || 0;
                stats.messages.innerText = event.data.messages || 0;
                stats.images.innerText = event.data.images || 0;

            }
            break;
    }
}

updateButton.addEventListener("click", () => {
    if (!isAuth) return;
    request.stats();
    request.chats();    
});
