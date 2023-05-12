const puppeteer = require('puppeteer');
const WebSocket = require('ws');
(async () => {

  const browser = await puppeteer.launch({ 
    headless: true, 
    defaultViewport: null,
    timeout: 0,
     });
  const page = await browser.newPage();

  await page.goto('https://www.omegle.com/#');
  
  // open modal by clicking 'Text' button
  const btnText = await page.waitForSelector('#chattypetextcell img');
  await btnText.click();

  // click both checkbox labels when modal opens
  const checkBoxLabels = await page.$$('div div p label')
  await checkBoxLabels[0].click();
  await checkBoxLabels[1].click();

  // click confirm button on modal
  const confirm = await page.$$('div div p input')
  await confirm[2].click()
  async function disconnectChat_ () {
    const button = await page.$('.disconnectbtn');
    const state = await button.evaluate(el => el.innerText);
    if (state.includes('New')) {
      return;
    } else if (state.includes('Really?')) {
      k = 1;
    } else if (state.includes('Stop')) {
      k = 2;
    };
    for (i = 0; i < k; i++) {

      await page.click('.disconnectbtn');
    }
  }

  async function newChat_ () {
    await disconnectChat_();
    const disconnectButton = await page.waitForSelector('.disconnectbtn');
    await disconnectButton.click();
  }

  async function sendMessage_ (message) {
    const chatInput = await page.$('.chatmsg');
    await chatInput.type(message);
    await page.keyboard.press('Enter');
  }

  await disconnectChat_();
  await page.evaluate(() => {
    "navigator.__defineGetter__('language',function(){return 'en';});"
  })

  //const ws = new WebSocket('ws://192.168.2.182:6565');
  const ws = new WebSocket('ws://localhost:6565');

  const user = 'Stranger';
  let roomId = null;
  let lastMessage = null; // Strangers last message


  ws.on('open', async () => {
    console.log('WebSocket connected');

    ws.send(JSON.stringify({
      type: 'JOIN_WAITING_LIST',
      data: { username: user },
    }));

    setInterval(async () => {
      const strangerMessages = await page.$$('.strangermsg span');
      if (strangerMessages.length === 0) return;
      let message = await strangerMessages[strangerMessages.length - 1].evaluate(el => el.innerText);
      if (lastMessage == message) return;
      lastMessage = message;
      if (!roomId) return;
      ws.send(JSON.stringify({
        type: 'CHAT_MESSAGE',
        data: { type: 'TEXT', content: message, roomId: roomId }
      }));
    }, 1000);

    setInterval(async () => {
      // If stranger disconnected
      const slog = await page.$$('.statuslog');
      if (slog.length < 3) return;
      const sText = await slog[slog.length - 3].evaluate(el => el.innerText);
      if (sText == 'Stranger has disconnected.' && roomId) {
        roomId = null;
        lastMessage = null;
        ws.send(JSON.stringify({ type: 'LEAVE_ROOM', data: { roomId: roomId } }));
        ws.send(JSON.stringify({ type: 'JOIN_WAITING_LIST', data: { username: user } }));
      }
    }, 3000);

  });

  ws.on('message', async (message) => {
    const event = JSON.parse(message);
    // console.log(event)
    switch (event.type) {
      case 'JOIN_ROOM_SUCCESS':
        roomId = event.data.roomId;
        strangerName = event.data.partner;
        newChat_();
        break;
      case 'CLIENT_LEFT':
        roomId = null;
        await disconnectChat_();
        // Join waiting list
        ws.send(JSON.stringify({
          type: 'JOIN_WAITING_LIST',
          data: { username: user }
        }));
        break;
      case 'CHAT_MESSAGE':
        // Only accepts the TEXT data type
        if (event.data.type === 'TEXT') {
          await sendMessage_(event.data.content);
        }

        break;
    }

  });




})();
