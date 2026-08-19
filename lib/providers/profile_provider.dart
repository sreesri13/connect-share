import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/profile_model.dart';
import '../models/category_model.dart';
import '../models/item_model.dart';
import '../services/supabase_service.dart';
import 'auth_provider.dart';

final supabaseServiceProvider = Provider<SupabaseService>((ref) {
  return SupabaseService();
});

final userProfileProvider = FutureProvider.autoDispose<ProfileModel?>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return null;
  final service = ref.watch(supabaseServiceProvider);
  return await service.getProfile(user.id);
});

final userCategoriesProvider = FutureProvider.autoDispose<List<CategoryModel>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];
  final service = ref.watch(supabaseServiceProvider);
  return await service.getCategories(user.id);
});

final userItemsProvider = FutureProvider.autoDispose<List<ItemModel>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];
  final service = ref.watch(supabaseServiceProvider);
  return await service.getItems(user.id);
});

// Selected items for QR generator
final selectedItemsForQRProvider = StateProvider<Set<String>>((ref) => {});
