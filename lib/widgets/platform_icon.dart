import 'package:flutter/material.dart';
import '../models/item_model.dart';
import '../config/theme.dart';

class PlatformIcon extends StatelessWidget {
  final ItemType type;
  final String content;
  final double size;
  final Color? color;

  const PlatformIcon({
    super.key,
    required this.type,
    required this.content,
    this.size = 22,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? AppColors.primaryLight;

    if (type == ItemType.url) {
      final urlLower = content.toLowerCase();
      if (urlLower.contains('instagram.com')) {
        return Icon(Icons.camera_alt, size: size, color: const Color(0xFFE1306C));
      } else if (urlLower.contains('twitter.com') || urlLower.contains('x.com')) {
        return Icon(Icons.close, size: size, color: Colors.white);
      } else if (urlLower.contains('facebook.com')) {
        return Icon(Icons.facebook, size: size, color: const Color(0xFF1877F2));
      } else if (urlLower.contains('linkedin.com')) {
        return Icon(Icons.business, size: size, color: const Color(0xFF0A66C2));
      } else if (urlLower.contains('youtube.com') || urlLower.contains('youtu.be')) {
        return Icon(Icons.play_circle_filled, size: size, color: const Color(0xFFFF0000));
      } else if (urlLower.contains('github.com')) {
        return Icon(Icons.code, size: size, color: Colors.white);
      } else if (urlLower.contains('wa.me') || urlLower.contains('whatsapp.com')) {
        return Icon(Icons.chat, size: size, color: const Color(0xFF25D366));
      } else if (urlLower.contains('telegram.me') || urlLower.contains('t.me')) {
        return Icon(Icons.send, size: size, color: const Color(0xFF229ED9));
      } else if (urlLower.contains('spotify.com')) {
        return Icon(Icons.music_note, size: size, color: const Color(0xFF1DB954));
      }
      return Icon(Icons.link, size: size, color: effectiveColor);
    }

    switch (type) {
      case ItemType.wifi:
        return Icon(Icons.wifi, size: size, color: AppColors.cyan);
      case ItemType.pdf:
        return Icon(Icons.picture_as_pdf, size: size, color: AppColors.rose);
      case ItemType.image:
        return Icon(Icons.image, size: size, color: AppColors.emerald);
      case ItemType.video:
        return Icon(Icons.videocam, size: size, color: AppColors.accent);
      case ItemType.audio:
        return Icon(Icons.audiotrack, size: size, color: AppColors.amber);
      case ItemType.text:
        return Icon(Icons.notes, size: size, color: AppColors.primaryLight);
      case ItemType.largefile:
        return Icon(Icons.folder_zip, size: size, color: AppColors.primaryLight);
      default:
        return Icon(Icons.insert_drive_file, size: size, color: effectiveColor);
    }
  }
}
