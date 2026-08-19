import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/business_model.dart';
import 'auth_provider.dart';
import 'profile_provider.dart';

final businessCategoriesProvider = FutureProvider.autoDispose<List<BusinessCategoryModel>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];
  final service = ref.watch(supabaseServiceProvider);
  return await service.getBusinessCategories(user.id);
});

final businessProductsProvider = FutureProvider.autoDispose<List<BusinessProductModel>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];
  final service = ref.watch(supabaseServiceProvider);
  return await service.getBusinessProducts(user.id);
});

final qrBusinessPagesProvider = FutureProvider.autoDispose<List<QRBusinessPageModel>>((ref) async {
  final user = ref.watch(currentUserProvider);
  if (user == null) return [];
  final service = ref.watch(supabaseServiceProvider);
  return await service.getQRBusinessPages(user.id);
});

// Cart state for public storefront
class CartItem {
  final BusinessProductModel product;
  final int quantity;

  const CartItem({required this.product, required this.quantity});

  CartItem copyWith({int? quantity}) {
    return CartItem(product: product, quantity: quantity ?? this.quantity);
  }
}

class CartNotifier extends StateNotifier<Map<String, CartItem>> {
  CartNotifier() : super({});

  void addToCart(BusinessProductModel product) {
    if (state.containsKey(product.id)) {
      state = {
        ...state,
        product.id: state[product.id]!.copyWith(
          quantity: state[product.id]!.quantity + 1,
        ),
      };
    } else {
      state = {
        ...state,
        product.id: CartItem(product: product, quantity: 1),
      };
    }
  }

  void removeFromCart(String productId) {
    if (!state.containsKey(productId)) return;
    if (state[productId]!.quantity > 1) {
      state = {
        ...state,
        productId: state[productId]!.copyWith(
          quantity: state[productId]!.quantity - 1,
        ),
      };
    } else {
      final newState = Map<String, CartItem>.from(state);
      newState.remove(productId);
      state = newState;
    }
  }

  void clearCart() {
    state = {};
  }

  double get subtotal {
    return state.values.fold(0.0, (sum, item) {
      final price = item.product.discountPrice ?? item.product.originalPrice;
      return sum + (price * item.quantity);
    });
  }

  int get totalItems {
    return state.values.fold(0, (sum, item) => sum + item.quantity);
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, Map<String, CartItem>>((ref) {
  return CartNotifier();
});
