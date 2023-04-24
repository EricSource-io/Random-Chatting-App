import 'package:flutter/material.dart';

enum ChatButtonState {
  stop,
  sure,
  search,
}

extension ChatButtonStateExtension on ChatButtonState {
  String get label {
    switch (this) {
      case ChatButtonState.stop:
        return "Stop";
      case ChatButtonState.sure:
        return "Sure?";
      case ChatButtonState.search:
        return "Search";
      default:
        throw Exception("Invalid state");
    }
  }
}

class ChatStateButton extends StatefulWidget {
  ChatButtonState buttonState;
  final Function onStop;
  final Function onNew;

  ChatStateButton({
    Key? key,
    required this.buttonState,
    required this.onStop,
    required this.onNew,
  }) : super(key: key);

  @override
  ChatStateButtonState createState() => ChatStateButtonState();
}

class ChatStateButtonState extends State<ChatStateButton> {
  void handleClick() {
    switch (widget.buttonState) {
      case ChatButtonState.stop:
        setState(() {
          widget.buttonState = ChatButtonState.sure;
        });
        break;
      case ChatButtonState.sure:
        // Button state needs to be handled inside the onStop
        widget.onStop();
        break;
      case ChatButtonState.search:
        // Button state needs to be handled inside the onNew
        widget.onNew();
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return TextButton(
      onPressed: handleClick,
      child: Text(
        widget.buttonState.label,
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14.0),
      ),
    );
  }
}
