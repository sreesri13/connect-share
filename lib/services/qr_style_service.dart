import 'dart:math';
import 'package:flutter/material.dart';
import '../models/qr_page_model.dart';

class QRStylePreset {
  final String name;
  final QRStyleConfig config;

  const QRStylePreset({required this.name, required this.config});
}

class QRStyleService {
  static const List<QRStylePreset> presets = [
    QRStylePreset(
      name: 'Classic',
      config: QRStyleConfig(
        bodyShape: 'square',
        eyeFrameShape: 'square',
        eyeBallShape: 'square',
        bodyColor: '#000000',
        eyeFrameColor: '#000000',
        eyeBallColor: '#000000',
        backgroundColor: '#ffffff',
      ),
    ),
    QRStylePreset(
      name: 'Modern',
      config: QRStyleConfig(
        bodyShape: 'rounded',
        eyeFrameShape: 'rounded',
        eyeBallShape: 'rounded',
        bodyColor: '#1a1a2e',
        eyeFrameColor: '#16213e',
        eyeBallColor: '#0f3460',
        backgroundColor: '#ffffff',
      ),
    ),
    QRStylePreset(
      name: 'Minimal',
      config: QRStyleConfig(
        bodyShape: 'dots',
        eyeFrameShape: 'circle',
        eyeBallShape: 'circle',
        bodyColor: '#333333',
        eyeFrameColor: '#333333',
        eyeBallColor: '#333333',
        backgroundColor: '#ffffff',
      ),
    ),
    QRStylePreset(
      name: 'Ocean',
      config: QRStyleConfig(
        bodyShape: 'rounded',
        eyeFrameShape: 'rounded',
        eyeBallShape: 'circle',
        bodyColor: '#0077b6',
        eyeFrameColor: '#023e8a',
        eyeBallColor: '#0096c7',
        backgroundColor: '#ffffff',
      ),
    ),
    QRStylePreset(
      name: 'Forest',
      config: QRStyleConfig(
        bodyShape: 'rounded',
        eyeFrameShape: 'leaf',
        eyeBallShape: 'rounded',
        bodyColor: '#2d6a4f',
        eyeFrameColor: '#1b4332',
        eyeBallColor: '#40916c',
        backgroundColor: '#ffffff',
      ),
    ),
    QRStylePreset(
      name: 'Diamond',
      config: QRStyleConfig(
        bodyShape: 'diamond',
        eyeFrameShape: 'rounded',
        eyeBallShape: 'rounded',
        bodyColor: '#2c3e50',
        eyeFrameColor: '#2c3e50',
        eyeBallColor: '#3498db',
        backgroundColor: '#ffffff',
      ),
    ),
  ];

  static Color hexToColor(String hexString) {
    final buffer = StringBuffer();
    if (hexString.length == 6 || hexString.length == 7) buffer.write('ff');
    buffer.write(hexString.replaceFirst('#', ''));
    try {
      return Color(int.parse(buffer.toString(), radix: 16));
    } catch (_) {
      return Colors.black;
    }
  }

  static String colorToHex(Color color) {
    return '#${color.toARGB32().toRadixString(16).padLeft(8, '0').substring(2)}';
  }

  static String? getContrastWarning(String bodyHex, String bgHex) {
    final bodyColor = hexToColor(bodyHex);
    final bgColor = hexToColor(bgHex);

    double getRelativeLuminance(Color c) {
      double r = (c.r * 255.0).round().clamp(0, 255) / 255.0;
      double g = (c.g * 255.0).round().clamp(0, 255) / 255.0;
      double b = (c.b * 255.0).round().clamp(0, 255) / 255.0;

      r = (r <= 0.03928) ? r / 12.92 : pow((r + 0.055) / 1.055, 2.4).toDouble();
      g = (g <= 0.03928) ? g / 12.92 : pow((g + 0.055) / 1.055, 2.4).toDouble();
      b = (b <= 0.03928) ? b / 12.92 : pow((b + 0.055) / 1.055, 2.4).toDouble();

      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    final l1 = getRelativeLuminance(bodyColor);
    final l2 = getRelativeLuminance(bgColor);
    final ratio = (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05);

    if (ratio < 3.0) {
      return 'Low contrast may affect QR scannability. Choose darker/lighter colors.';
    }
    if (ratio < 4.5) {
      return 'Moderate contrast. Scannable in good lighting.';
    }
    return null;
  }
}
