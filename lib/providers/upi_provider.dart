import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/upi_payment_model.dart';
import 'auth_provider.dart';
import 'profile_provider.dart';

final userUPIPaymentsProvider = FutureProvider.autoDispose<List<UPIPaymentModel>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];
  final service = ref.watch(supabaseServiceProvider);
  return await service.getUPIPayments(user.id);
});
