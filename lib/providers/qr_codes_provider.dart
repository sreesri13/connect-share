import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/qr_page_model.dart';
import 'auth_provider.dart';
import 'profile_provider.dart';

final userQRPagesProvider = FutureProvider.autoDispose<List<QRPageModel>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];
  final service = ref.watch(supabaseServiceProvider);
  return await service.getQRPages(user.id);
});

final recycleBinQRPagesProvider = FutureProvider.autoDispose<List<QRPageModel>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];
  final service = ref.watch(supabaseServiceProvider);
  return await service.getQRPages(user.id, includeDeleted: true);
});
