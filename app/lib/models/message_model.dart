enum MessageSender {
  currentUser,
  otherUser,
  system,
}

enum MessageDataType { text, image }

class Message {
  dynamic data;
  MessageSender sender;
  MessageDataType type;
  Message({required this.data, required this.sender, required this.type});
}
