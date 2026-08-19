import 'dart:io';
import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/app_config.dart';

class StorageService {
  final SupabaseClient _supabase = Supabase.instance.client;

  /// Upload file from local File path
  Future<String> uploadFile({
    required String userId,
    required File file,
    String? folder,
  }) async {
    final bytes = await file.readAsBytes();
    final fileName = file.path.split(Platform.pathSeparator).last;
    final ext = fileName.split('.').last;
    return await uploadBytes(
      userId: userId,
      bytes: bytes,
      fileExtension: ext,
      folder: folder,
    );
  }

  /// Upload raw bytes
  Future<String> uploadBytes({
    required String userId,
    required Uint8List bytes,
    required String fileExtension,
    String? folder,
  }) async {
    final folderPrefix = folder != null && folder.isNotEmpty ? '$folder/' : '';
    final path = '$userId/$folderPrefix${DateTime.now().millisecondsSinceEpoch}.$fileExtension';

    await _supabase.storage.from(AppConfig.uploadsBucket).uploadBinary(
          path,
          bytes,
          fileOptions: FileOptions(
            contentType: _getContentType(fileExtension),
            upsert: false,
          ),
        );

    final publicUrl = _supabase.storage
        .from(AppConfig.uploadsBucket)
        .getPublicUrl(path);

    return publicUrl;
  }

  String _getContentType(String ext) {
    switch (ext.toLowerCase()) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      case 'svg':
        return 'image/svg+xml';
      case 'pdf':
        return 'application/pdf';
      case 'mp4':
        return 'video/mp4';
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      default:
        return 'application/octet-stream';
    }
  }
}
