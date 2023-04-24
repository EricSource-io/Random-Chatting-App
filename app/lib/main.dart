import 'package:flutter/material.dart';
import 'package:waddletalk/screens/home_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'WaddleTalk',
      theme: theme,
      debugShowCheckedModeBanner: false,
      home: const HomeScreen(),
    );
  }
}

final ThemeData theme = ThemeData(
  primaryColor: const Color(0xFF00A86B),
  scaffoldBackgroundColor: Colors.white,
  colorScheme: ColorScheme.fromSwatch(
    primarySwatch: const MaterialColor(0xFF00A86B, {
      50: Color(0xFFE6F8EE),
      100: Color(0xFFB3E6C8),
      200: Color(0xFF80D5A1),
      300: Color(0xFF4DBE79),
      400: Color(0xFF26B05D),
      500: Color(0xFF00A86B),
      600: Color(0xFF009D64),
      700: Color(0xFF009358),
      800: Color(0xFF008A4D),
      900: Color(0xFF00763B),
    }),
    backgroundColor: Colors.white,
    brightness: Brightness.light,
  ),
  appBarTheme: const AppBarTheme(
    elevation: 0.0,
    backgroundColor: Colors.white,
    iconTheme: IconThemeData(
      color: Color(0xFF00A86B),
    ),
  ),
  textTheme: TextTheme(
    titleLarge: const TextStyle(
      color: Colors.black,
      fontSize: 24.0,
      fontWeight: FontWeight.bold,
    ),
    titleMedium: TextStyle(
      color: Colors.grey[600],
      fontSize: 14.0,
      fontWeight: FontWeight.w500,
    ),
    titleSmall: const TextStyle(
      color: Colors.black,
      fontSize: 16.0,
      fontWeight: FontWeight.normal,
    ),
  ),
);
