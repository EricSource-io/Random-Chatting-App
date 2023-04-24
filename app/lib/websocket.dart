import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'dart:typed_data';

class MyWebSocket {
  static Completer<WebSocket> _completer = Completer<WebSocket>();
  static const String _url = "ws://waddletalk.servehttp.com:6565";
  static const int _pingSeconds = 3;
  static const int _timeoutSeconds = 5;
  static bool isConnected = false;
  static Function onDisconnect = () {};
  static void Function(dynamic) onMessage = (message) {};
  static void Function(dynamic) _onError = (error) {}; // private error callback

  static Future<WebSocket> get ws async => _completer.future;

  static void connect() {
    if (isConnected) {
      return;
    }

    WebSocket.connect(_url)
        .timeout(const Duration(seconds: _timeoutSeconds))
        .then((WebSocket socket) {
      isConnected = true;

      socket.pingInterval =
          const Duration(seconds: _pingSeconds); // send a ping every 3 seconds

      // Listen to incoming messages on the socket and call the onMessage callback
      socket.listen((message) {
        onMessage(message);
      }, onDone: () {
        //! Socket closed
        isConnected = false;
        // Reset completer
        _completer = Completer<WebSocket>();
        onDisconnect();

        // Schedule a reconnect after the specified delay
        // Timer(const Duration(seconds: reconnectDelaySeconds), connect);
      });

      // Completes the _completer with the socket instance
      _completer.complete(socket);
    }).catchError((error) {
      // Call the private _onError callback with the error object
      isConnected = false;
      // Reset completer
      _completer = Completer<WebSocket>();
      _onError(error);
    });
  }

  // Sets the onError callback to the provided callback function
  static void onError(void Function(dynamic) onError) {
    _onError = onError;
  }

  static void disconnect() {
    if (isConnected) {
      ws.then((socket) {
        socket.close();
      }).whenComplete(() {
        isConnected = false;
        // Reset completer
        _completer = Completer<WebSocket>();
      });
    }
  }

  static void stream(
      List<Uint8List> chunks, String initialPayload, String finalPayload) {
    ws.then((socket) {
      //! 1. InitialPayload
      socket.add(initialPayload);

      //! 2. Chunks
      for (var chunk in chunks) {
        final payload = {
          "type": "CHAT_MESSAGE",
          "data": {"chunk": chunk}
        };
        final jsonPayload = jsonEncode(payload);
        socket.add(jsonPayload);
      }

      //! 3. FinalPaylaod
      socket.add(finalPayload);
    });
  }
}
