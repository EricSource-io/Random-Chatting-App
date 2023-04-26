import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:waddletalk/widget/image_picker_button.dart';
import 'package:waddletalk/screens/home_screen.dart';
import 'package:waddletalk/websocket.dart';
import 'package:waddletalk/widget/chat_state_button.dart';
import 'package:waddletalk/models/message_model.dart';
import 'package:waddletalk/utils.dart';
import 'package:photo_view/photo_view.dart';

class ChatScreen extends StatefulWidget {
  final String username;
  const ChatScreen({Key? key, required this.username}) : super(key: key);

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  bool _joinedRoom = false;
  String strangerName = "Stranger"; // Strangers username
  ChatButtonState chatButtonState = ChatButtonState.stop;
  late String _roomId;
  final TextEditingController _textEditingController =
      TextEditingController(); // Message input
  bool _showSendButton = false;
  late ImageStreamData _imageStreamData;
  List<Message> messages = [];

  @override
  void initState() {
    super.initState();

    MyWebSocket.onDisconnect = _onWebSocketDisconnect;

    MyWebSocket.onMessage = _onWebSocketMessage;

    _textEditingController.addListener(_onTextChanged);

    _newChat();
  }

  @override
  void dispose() {
    _textEditingController.removeListener(_onTextChanged);
    _textEditingController.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    setState(() {
      _showSendButton = _textEditingController.text.trim().isNotEmpty;
    });
  }

  void _onWebSocketDisconnect() {
    showDialog(
      context: context,
      builder: (context) => WillPopScope(
        onWillPop: () async {
          Navigator.of(context).pop(); // Close the dialog
          Navigator.pushReplacement(
            context,
            MaterialPageRoute(
              builder: (context) => const HomeScreen(),
            ),
          );
          return true;
        },
        child: AlertDialog(
          title: const Text(
            "Connection failed",
            style: TextStyle(
              fontSize: 18.0,
              fontWeight: FontWeight.bold,
              color: Colors.red,
            ),
          ),
          content: const Text(
            "There was an error connecting to the server. Please try again later.",
            style: TextStyle(
              fontSize: 16.0,
              color: Colors.black,
            ),
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.of(context).pop(); // Close the dialog
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const HomeScreen(),
                  ),
                );
              },
              style: TextButton.styleFrom(
                backgroundColor: const Color(0xFF3FBFBF),
              ),
              child: const Text(
                "OK",
                style: TextStyle(
                  fontSize: 16.0,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          ],
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }

  void _onWebSocketMessage(message) {
    final decodedMessage = jsonDecode(message);
    final type = decodedMessage["type"];
    final data = decodedMessage["data"];

    addMessage(content, dataType, sender) {
      setState(() {
        messages.add(Message(data: content, sender: sender, type: dataType));
      });
    }

    switch (type) {
      case "JOIN_ROOM_SUCCESS":
        _roomId = data["roomId"];
        setState(() {
          _joinedRoom = true;
          strangerName = data["partner"];
          chatButtonState = ChatButtonState.stop;
        });
        String content = "$strangerName joined the chat";
        addMessage(content, MessageDataType.text, MessageSender.system);
        break;
      case "CLIENT_LEFT":
        setState(() {
          chatButtonState = ChatButtonState.search;
        });
        String content = "$strangerName has left the chat";
        addMessage(content, MessageDataType.text, MessageSender.system);
        break;
      case "CHAT_MESSAGE":
        switch (data["type"]) {
          case "TEXT":
            final content = data["content"];
            addMessage(content, MessageDataType.text, MessageSender.otherUser);
            break;
          case "IMAGE_STREAM_HEADER":
            final contentLength = data["contentLength"];
            _imageStreamData = ImageStreamData(
              contentLength: contentLength,
              data: [],
            );

            break;
          case "IMAGE_STREAM_CHUNK":
            List<int> chunk =
                List.from(data["chunk"]["data"]).map((e) => e as int).toList();
            _imageStreamData.data.addAll(chunk);

            break;
          case "IMAGE_STREAM_END":
            Uint8List uint8ImageData =
                Uint8List.fromList(_imageStreamData.data);
            addMessage(
                uint8ImageData, MessageDataType.image, MessageSender.otherUser);
            break;
          default:
            //! dataType not set
            return;
        }
        break;
      case "ERROR":
        {
          switch (data["type"]) {
            case "INTERNAL_SERVER_ERROR":
              break;
            case "RATE_LIMIT_EXCEEDED":
              break;
            case "IMAGE_SIZE_LIMIT_EXCEEDED":
              addMessage("IMAGE_SIZE_LIMIT_EXCEEDED", MessageDataType.text,
                  MessageSender.system);
              break;
            default:
              //! dataType not set
              return;
          }
        }

        break;
    }
  }

  void _sendMessage(String text) {
    // Check if the text or room ID is empty, if so, return immediately
    if (text.trim().isEmpty || _roomId.isEmpty) return;

    // Update the chat button state and add a new message to the messages list
    setState(() {
      chatButtonState = ChatButtonState.stop;
      messages.add(Message(
          data: text.trim(),
          sender: MessageSender.currentUser,
          type: MessageDataType.text));
    });

    // Create a payload to send over the WebSocket
    final payload = {
      "type": "CHAT_MESSAGE",
      "data": {"type": "TEXT", "roomId": _roomId, "content": text}
    };

    // Convert the payload to a JSON string
    final jsonPayload = jsonEncode(payload);

    // Send the JSON payload over the WebSocket
    MyWebSocket.ws.then((socket) => socket.add(jsonPayload));
  }

  void _sendImage(String? imagePath) async {
    // Check if the imagePath is null or room ID is empty, if so, return immediately
    if (imagePath == null || _roomId.isEmpty) return;

    // Open the image file and get its length
    final file = File(imagePath);
    final length = await file.length();

    const imageSizeLimit = 1024 * 1024 * 6; //6mb
    if (length > imageSizeLimit) {
      setState(() {
        messages.add(Message(
            data: "Image size is too big. Max 6 MB allowed.",
            sender: MessageSender.system,
            type: MessageDataType.text));
      });
      return;
    }

    // Update the chat button state and add a new message to the messages list
    final fileData = await file.readAsBytes();
    setState(() {
      chatButtonState = ChatButtonState.stop;
      messages.add(Message(
          data: fileData,
          sender: MessageSender.currentUser,
          type: MessageDataType.image));
    });

    // Prepare the initial payload to be sent to the WebSocket server
    final initialPayload = {
      "type": "CHAT_MESSAGE",
      "data": {
        "type": "IMAGE_STREAM_HEADER",
        "roomId": _roomId,
        "contentLength": length
      }
    };

    // Encode the initial payload to JSON and send it to the WebSocket server
    final jsonInitialPayload = jsonEncode(initialPayload);
    final socket = await MyWebSocket.ws;
    socket.add(jsonInitialPayload);

    // Open the file stream and send it over the WebSocket connection
    final stream = file.openRead();
    await socket.addStream(stream);
  }

  void _stopChat() {
    // Reset the current room ID to empty
    _roomId = "";

    // Connect to the WebSocket acnd send a message to leave the current room
    MyWebSocket.ws.then((socket) {
      // Create a payload object containing the message type and room ID
      final payload = {
        "type": "LEAVE_ROOM",
        "data": {"roomId": _roomId}
      };

      // Convert the payload to a JSON string
      final jsonPayload = jsonEncode(payload);

      // Send the JSON payload to the WebSocket
      socket.add(jsonPayload);

      // Update the state of the widget
      setState(() {
        // Change the chat button state to "search"
        chatButtonState = ChatButtonState.search;

        // Add a system message to the message list
        messages.add(Message(
            data: "You have left the chat",
            sender: MessageSender.system,
            type: MessageDataType.text));
      });
    });
  }

  void _newChat() {
    // Reset the state of the widget by clearing the message list and setting `_joinedRoom` to `false`
    setState(() {
      _joinedRoom = false;
      messages.clear();
    });

    // Connect to the WebSocket and send a message to join the waiting list
    MyWebSocket.ws.then((socket) {
      // Create a payload object containing the message type and username
      final payload = {
        "type": "JOIN_WAITING_LIST",
        "data": {"username": widget.username}
      };

      // Convert the payload to a JSON string
      final jsonPayload = jsonEncode(payload);

      // Send the JSON payload to the WebSocket
      socket.add(jsonPayload);
    });
  }

  void _leaveChatSearch() {
    // Reset the state of the widget by setting `_joinedRoom` to `false`
    setState(() {
      _joinedRoom = false;
    });

    // Connect to the WebSocket and send a message to leave the waiting list
    MyWebSocket.ws.then((socket) {
      // Create a payload object containing the message type
      final payload = {"type": "LEAVE_WAITING_LIST"};

      // Convert the payload to a JSON string
      final jsonPayload = jsonEncode(payload);

      // Send the JSON payload to the WebSocket
      socket.add(jsonPayload);
    });
  }

  Widget _buildMessage(Message message) {
    if (message.type == MessageDataType.text) {
      if (message.sender == MessageSender.system) {
        return Container(
          margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
          child: Center(
            child: Container(
              padding: const EdgeInsets.symmetric(vertical: 5, horizontal: 10),
              decoration: BoxDecoration(
                color: const Color.fromARGB(255, 191, 213, 203),
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                message.data,
                style: const TextStyle(fontSize: 16.0),
              ),
            ),
          ),
        );
      }
      return Container(
        margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
        child: Row(
          mainAxisAlignment: message.sender == MessageSender.currentUser
              ? MainAxisAlignment.end
              : MainAxisAlignment.start,
          children: [
            message.sender == MessageSender.currentUser
                ? const SizedBox(width: 45.0)
                : Container(),
            Flexible(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  vertical: 10,
                  horizontal: 15,
                ),
                decoration: BoxDecoration(
                  color: message.sender == MessageSender.currentUser
                      ? const Color(0xFF3FBFBF)
                      : const Color(0xFFf89370),
                  borderRadius: BorderRadius.only(
                    topLeft: const Radius.circular(20.0),
                    topRight: const Radius.circular(20.0),
                    bottomLeft: message.sender == MessageSender.currentUser
                        ? const Radius.circular(20.0)
                        : const Radius.circular(0.0),
                    bottomRight: message.sender == MessageSender.currentUser
                        ? const Radius.circular(0.0)
                        : const Radius.circular(20.0),
                  ),
                ),
                child: Text(
                  message.data,
                  style: const TextStyle(fontSize: 18.0, color: Colors.white),
                ),
              ),
            ),
            message.sender == MessageSender.currentUser
                ? Container()
                : const SizedBox(width: 45.0),
          ],
        ),
      );
    } else if (message.type == MessageDataType.image) {
      Uint8List imageBuffer = message.data;
      return GestureDetector(
        onTap: () {
          showDialog(
            context: context,
            builder: (_) => LayoutBuilder(
              builder: (BuildContext context, BoxConstraints constraints) {
                return Dialog(
                  backgroundColor: Colors.transparent,
                  elevation: 0.0,
                  child: SizedBox(
                    width: constraints.maxWidth,
                    height: constraints.maxHeight,
                    child: PhotoView(
                      imageProvider: MemoryImage(imageBuffer),
                      backgroundDecoration:
                          const BoxDecoration(color: Colors.transparent),
                      loadingBuilder: (context, event) => const Center(
                        child: CircularProgressIndicator(),
                      ),
                      maxScale: PhotoViewComputedScale.contained * 2.0,
                      minScale: PhotoViewComputedScale.contained,
                    ),
                  ),
                );
              },
            ),
          );
        },
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 10),
          child: Row(
            mainAxisAlignment: message.sender == MessageSender.currentUser
                ? MainAxisAlignment.end
                : MainAxisAlignment.start,
            children: [
              message.sender == MessageSender.currentUser
                  ? const SizedBox(width: 85.0)
                  : Container(),
              Expanded(
                child: SizedBox(
                  width: double.infinity,
                  child: ClipRRect(
                    borderRadius: BorderRadius.only(
                      topLeft: const Radius.circular(20.0),
                      topRight: const Radius.circular(20.0),
                      bottomLeft: message.sender == MessageSender.currentUser
                          ? const Radius.circular(20.0)
                          : const Radius.circular(0.0),
                      bottomRight: message.sender == MessageSender.currentUser
                          ? const Radius.circular(0.0)
                          : const Radius.circular(20.0),
                    ),
                    child: Image.memory(
                      imageBuffer,
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
              ),
              message.sender == MessageSender.currentUser
                  ? Container()
                  : const SizedBox(width: 45.0),
            ],
          ),
        ),
      );
    }
    // ! Image type not available
    return Container();
  }

  Widget _buildInput() {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10.0, horizontal: 10.0),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(6.0),
        color: Colors.white,
      ),
      child: Row(
        children: [
          Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6.0),
                color: Colors.transparent,
              ),
              width: 70,
              height: 55,
              child: ChatStateButton(
                buttonState: chatButtonState,
                onStop: () => _stopChat(),
                onNew: () => _newChat(),
              )),
          Container(
            width: 1,
            height: 30,
            color: Colors.grey,
          ),
          Expanded(
            child: SizedBox(
              height: 55.0,
              child: TextField(
                controller: _textEditingController,
                textAlignVertical: TextAlignVertical.center,
                style: const TextStyle(
                    fontWeight: FontWeight.normal,
                    fontSize: 16.0,
                    color: Colors.black),
                decoration: const InputDecoration(
                  hintText: 'Say Something...',
                  hintStyle: TextStyle(fontWeight: FontWeight.normal),
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.only(
                      left: 10.0, right: 0.0, top: 10.0, bottom: 10.0),
                ),
                onSubmitted: (String value) {
                  if (value.trim().isNotEmpty) {
                    _sendMessage(value);
                  }
                  _textEditingController.clear();
                },
              ),
            ),
          ),
          Container(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(6.0),
                color: Colors.transparent,
              ),
              width: 50,
              height: 55,
              child: _showSendButton
                  ? IconButton(
                      onPressed: () {
                        if (_textEditingController.text.trim().isNotEmpty) {
                          _sendMessage(_textEditingController.text);
                        }
                        _textEditingController.clear();
                      },
                      icon: Icon(
                        Icons.send,
                        color: Theme.of(context).primaryColor,
                      ))
                  : ImagePickerButton(
                      context: context, onImageSelected: _sendImage)),
        ],
      ),
    );
  }

  Widget _buildLoadingScreen() {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: const [
            CircularProgressIndicator(),
            SizedBox(height: 30.0),
            Text(
              "Searching for new random chats...",
              style: TextStyle(fontSize: 16.0),
            ),
          ],
        ),
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(16.0),
        height: 90.0,
        child: ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF3FBFBF),
            textStyle: const TextStyle(fontSize: 20),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(6.0),
            ),
          ),
          onPressed: () {
            _leaveChatSearch();
            Navigator.pushReplacement(context,
                MaterialPageRoute(builder: (context) => const HomeScreen()));
          },
          child: const Text("Stop"),
        ),
      ),
    );
  }

  Widget _buildChatScreen() {
    return Scaffold(
      backgroundColor: const Color(0xFFEBF4F0),
      appBar: AppBar(
        elevation: 2.0,
        leading: IconButton(
          onPressed: () {
            _stopChat();
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => const HomeScreen(),
              ),
            );
          },
          icon: const Icon(
            Icons.close,
            size: 30.0,
          ),
        ),
        backgroundColor: Colors.white,
        title: Text(
          strangerName,
          style: const TextStyle(
              color: Colors.black, fontSize: 18.0, fontWeight: FontWeight.w500),
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 10.0),
            child: InputChip(
              isEnabled: false,
              onPressed: () {},
              pressElevation: 0.0,
              disabledColor: const Color(0xFFEBF4F0),
              backgroundColor: const Color(0xFFEBF4F0),
              label: Row(children: const <Widget>[
                Icon(
                  Icons.forum_outlined,
                  size: 20.0,
                ),
                SizedBox(width: 4.0),
                Text("Add"),
              ]),
            ),
          )
        ],
      ),
      body:
          Column(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Flexible(
          child: ListView.builder(
            reverse: true,
            shrinkWrap: true,
            itemCount: messages.length,
            physics: const BouncingScrollPhysics(),
            itemBuilder: (BuildContext context, index) {
              final int messageIndex =
                  messages.length - 1 - index; // reverse list
              return _buildMessage(messages[messageIndex]);
            },
          ),
        ),
        Column(
          children: [
            const Divider(height: 1),
            _buildInput(),
          ],
        )
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    return _joinedRoom ? _buildChatScreen() : _buildLoadingScreen();
  }
}
