import 'dart:async';
import 'dart:io';
import 'dart:convert';
import 'package:image/image.dart';

// ! Unused
String compressImageToBase64(String imagePath) {
  // Load the image file into memory
  final bytes = File(imagePath).readAsBytesSync();

  // Decode the image using the image package
  final image = decodeImage(bytes);

  // Compress the image to reduce its size
  final compressedImage = encodeJpg(image!, quality: 50);

  // Convert the compressed image to a base64 string
  final base64Image = base64Encode(compressedImage);

  return base64Image;
}

class ImageStreamData {
  final int contentLength;
  final List<int> data;
  final bool isFinal;

  ImageStreamData(
      {required this.contentLength, required this.data, this.isFinal = false});
}

class ChunkedStreamIterator
    extends StreamTransformerBase<List<int>, List<int>> {
  final int chunkSize;

  ChunkedStreamIterator(this.chunkSize);

  @override
  Stream<List<int>> bind(Stream<List<int>> stream) async* {
    final buffer = <int>[];
    await for (final chunk in stream) {
      var offset = 0;
      while (offset < chunk.length) {
        final remaining = chunk.length - offset;
        if (buffer.length + remaining >= chunkSize) {
          final overflow = chunkSize - buffer.length;
          buffer.addAll(chunk.sublist(offset, offset + overflow));
          yield buffer.toList();
          buffer.clear();
          offset += overflow;
        } else {
          buffer.addAll(chunk.sublist(offset));
          offset += remaining;
        }
      }
    }
    if (buffer.isNotEmpty) {
      yield buffer.toList();
    }
  }
}
