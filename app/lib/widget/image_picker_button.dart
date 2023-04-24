import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

class ImagePickerButton extends StatelessWidget {
  final BuildContext context;
  final Function(String?) onImageSelected;

  const ImagePickerButton(
      {Key? key, required this.context, required this.onImageSelected})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(6.0),
        color: Colors.transparent,
      ),
      width: 50,
      height: 55,
      child: TextButton(
        onPressed: () async {
          final ImagePicker picker = ImagePicker();
          final XFile? image = await showModalBottomSheet(
            context: context,
            builder: (BuildContext context) {
              return SizedBox(
                height: 200,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: TextButton.icon(
                        onPressed: () {
                          picker
                              .pickImage(source: ImageSource.gallery)
                              .then((XFile? image) {
                            String? imagePath = image?.path;
                            onImageSelected(imagePath);
                            Navigator.of(context).pop(image);
                          });
                        },
                        icon: const Icon(Icons.photo_album),
                        label: const Text('Choose from gallery'),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Expanded(
                      child: TextButton.icon(
                        onPressed: () {
                          picker
                              .pickImage(source: ImageSource.camera)
                              .then((XFile? image) {
                            String? imagePath = image?.path;
                            onImageSelected(imagePath);
                            Navigator.of(context).pop(image);
                          });
                        },
                        icon: const Icon(Icons.camera_alt),
                        label: const Text('Take a photo'),
                      ),
                    ),
                  ],
                ),
              );
            },
          );
          if (image == null) return; // User canceled selection
        },
        child: const Center(
          child: Icon(Icons.image_outlined),
        ),
      ),
    );
  }
}
