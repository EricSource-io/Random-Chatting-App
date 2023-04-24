import 'package:flutter/material.dart';
import 'package:waddletalk/screens/chat_screen.dart';

import 'package:waddletalk/websocket.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  HomeScreenState createState() => HomeScreenState();
}

class HomeScreenState extends State<HomeScreen> {
  final _nameController = TextEditingController();
  String? _selectedGender = "Male";
  bool isConnecting = false;

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  void _startChatting() {
    openChatScreen() => Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => ChatScreen(username: _nameController.text),
          ),
        );
    if (MyWebSocket.isConnected) {
      openChatScreen();
    } else {
      setState(() {
        isConnecting = true;
      });
      // Establish WebSocket connection
      MyWebSocket.onError((error) {
        setState(() {
          isConnecting = false;
        });
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
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
                  Navigator.of(context).pop();
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
        );
      });
      MyWebSocket.ws.whenComplete(() {
        if (!MyWebSocket.isConnected) return;

        isConnecting = false;
        openChatScreen();
      });
      MyWebSocket.connect();
    }
  }

  Widget _buildNameInput() {
    return SizedBox(
      height: 75.0,
      child: TextFormField(
        controller: _nameController,
        maxLength: 10,
        style: const TextStyle(color: Colors.black),
        decoration: InputDecoration(
          labelText: 'Name',
          hintText: "Stranger",
          border: OutlineInputBorder(
            borderSide: BorderSide(
              color: Colors.grey.withOpacity(0.8),
            ),
          ),
          focusedBorder: const OutlineInputBorder(
            borderSide: BorderSide(
              color: Color(0xFF3FBFBF),
              width: 2,
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderSide: BorderSide(
              color: Colors.grey.withOpacity(0.6),
            ),
          ),
          labelStyle: TextStyle(
            color: Colors.grey.withOpacity(0.6),
            fontWeight: FontWeight.w500,
          ),
          floatingLabelBehavior: FloatingLabelBehavior.always,
        ),
      ),
    );
  }

  Widget _buildGenderInput() {
    return SizedBox(
      height: 56.0,
      child: DropdownButtonFormField<String>(
        value: _selectedGender,
        onChanged: (newValue) {
          setState(() {
            _selectedGender = newValue;
          });
        },
        decoration: InputDecoration(
          labelText: 'Gender',
          border: OutlineInputBorder(
            borderSide: BorderSide(
              color: Colors.grey.withOpacity(0.8),
            ),
          ),
          focusedBorder: const OutlineInputBorder(
            borderSide: BorderSide(
              color: Color(0xFF3FBFBF),
              width: 2,
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderSide: BorderSide(
              color: Colors.grey.withOpacity(0.6),
            ),
          ),
          labelStyle: TextStyle(
            color: Colors.grey.withOpacity(0.6),
            fontWeight: FontWeight.w500,
          ),
          floatingLabelBehavior: FloatingLabelBehavior.always,
        ),
        items: const [
          DropdownMenuItem(
            value: 'Male',
            child: Text(
              'Male',
              style: TextStyle(
                color: Colors.black87,
              ),
            ),
          ),
          DropdownMenuItem(
            value: 'Female',
            child: Text(
              'Female',
              style: TextStyle(
                color: Colors.black87,
              ),
            ),
          ),
          DropdownMenuItem(
            value: 'Other',
            child: Text(
              'Other',
              style: TextStyle(
                color: Colors.black87,
              ),
            ),
          ),
        ],
        dropdownColor: Colors.white,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Random Chat'),
      ),
      body: Center(
        child: SingleChildScrollView(
          physics: const NeverScrollableScrollPhysics(),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Text(
                'Welcome to WaddleTalk',
                style: TextStyle(
                  fontSize: 24.0,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 40.0),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 50.0),
                child: _buildNameInput(),
              ),
              const SizedBox(height: 15.0),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 50.0),
                child: _buildGenderInput(),
              ),
              const SizedBox(height: 80.0),
              (isConnecting
                  ? const CircularProgressIndicator()
                  : ElevatedButton.icon(
                      onPressed: _startChatting,
                      icon: const Icon(Icons.chat_bubble),
                      label: const Text('Start Chatting'),
                      style: ElevatedButton.styleFrom(
                        minimumSize: const Size(225, 60.0),
                        backgroundColor: const Color(0xFF3FBFBF),
                        textStyle: const TextStyle(fontSize: 20.0),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(6.0),
                        ),
                      ),
                    )),
            ],
          ),
        ),
      ),
    );
  }
}
