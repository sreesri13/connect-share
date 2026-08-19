import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../models/business_model.dart';
import '../../providers/business_provider.dart';
import '../../services/location_service.dart';
import '../../services/share_export_service.dart';
import '../../services/supabase_service.dart';
import '../../widgets/password_prompt_dialog.dart';

class BusinessStoreScreen extends ConsumerStatefulWidget {
  final String? publicId;
  final String? storeSlug;

  const BusinessStoreScreen({super.key, this.publicId, this.storeSlug});

  @override
  ConsumerState<BusinessStoreScreen> createState() => _BusinessStoreScreenState();
}

class _BusinessStoreScreenState extends ConsumerState<BusinessStoreScreen> {
  final _supabaseService = SupabaseService();
  final _locationService = LocationService();
  final _shareService = ShareExportService();

  QRBusinessPageModel? _store;
  List<BusinessCategoryModel> _categories = [];
  List<BusinessProductModel> _products = [];
  String _selectedCategory = 'all';
  String _searchQuery = '';
  bool _isLoading = true;
  String? _errorMessage;

  // Security
  bool _isPasswordUnlocked = false;
  bool _isLocationVerified = true;
  bool _isExpired = false;

  @override
  void initState() {
    super.initState();
    _loadStoreData();
  }

  Future<void> _loadStoreData() async {
    setState(() => _isLoading = true);
    try {
      QRBusinessPageModel? store;
      if (widget.storeSlug != null && widget.storeSlug!.isNotEmpty) {
        store = await _supabaseService.getQRBusinessPageByStoreSlug(widget.storeSlug!);
      } else if (widget.publicId != null && widget.publicId!.isNotEmpty) {
        store = await _supabaseService.getQRBusinessPageByPublicId(widget.publicId!);
      }

      if (store == null || store.isDeleted) {
        setState(() {
          _errorMessage = 'Store not found or no longer active';
          _isLoading = false;
        });
        return;
      }

      // Check Expiry
      if (store.expiresAt != null && store.expiresAt!.isBefore(DateTime.now())) {
        setState(() {
          _store = store;
          _isExpired = true;
          _isLoading = false;
        });
        return;
      }

      // Check Location
      if (store.locationLocked && store.locationLat != null && store.locationLng != null) {
        final isNear = await _locationService.verifyLocationProximity(
          targetLat: store.locationLat!,
          targetLng: store.locationLng!,
        );
        if (!isNear) {
          setState(() {
            _store = store;
            _isLocationVerified = false;
            _isLoading = false;
          });
          return;
        }
      }

      // Check Password
      if (store.hasPassword && !_isPasswordUnlocked) {
        setState(() {
          _store = store;
          _isLoading = false;
        });
        WidgetsBinding.instance.addPostFrameCallback((_) async {
          final unlocked = await PasswordPromptDialog.show(
            context,
            publicId: store!.publicId,
            title: store.businessName ?? 'Store',
          );
          if (unlocked) {
            setState(() => _isPasswordUnlocked = true);
            _fetchProductsAndLog(store);
          }
        });
        return;
      }

      await _fetchProductsAndLog(store);
    } catch (e) {
      setState(() {
        _errorMessage = 'Error loading store: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchProductsAndLog(QRBusinessPageModel store) async {
    final categories = await _supabaseService.getBusinessCategories(store.userId);
    final products = await _supabaseService.getBusinessProducts(store.userId);

    _supabaseService.logQRScan(qrBusinessPageId: store.id, deviceType: 'Mobile');

    if (mounted) {
      setState(() {
        _store = store;
        _categories = categories;
        _products = products.where((p) => p.status == 'active').toList();
        _isLoading = false;
      });
    }
  }

  void _sendWhatsAppOrder(Map<String, CartItem> cart, double subtotal) async {
    if (_store?.businessWhatsapp == null || _store!.businessWhatsapp!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No WhatsApp number configured for this store')),
      );
      return;
    }

    final cleanPhone = _store!.businessWhatsapp!.replaceAll(RegExp(r'[^0-9]'), '');
    final buffer = StringBuffer();
    buffer.writeln('Hello! I would like to place an order from ${_store?.businessName ?? "your store"}:\n');

    for (final item in cart.values) {
      final price = item.product.discountPrice ?? item.product.originalPrice;
      buffer.writeln('• ${item.product.name} x ${item.quantity} = ₹${(price * item.quantity).toStringAsFixed(2)}');
    }

    buffer.writeln('\nTotal Amount: ₹${subtotal.toStringAsFixed(2)}');
    buffer.writeln('\nPlease confirm my order. Thank you!');

    final encodedMsg = Uri.encodeComponent(buffer.toString());
    final url = 'https://wa.me/$cleanPhone?text=$encodedMsg';
    final uri = Uri.parse(url);

    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _showCartSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => Consumer(
        builder: (ctx, ref, _) {
          final cart = ref.watch(cartProvider);
          final cartNotifier = ref.read(cartProvider.notifier);
          final subtotal = cartNotifier.subtotal;

          return Container(
            padding: const EdgeInsets.all(20),
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.shopping_bag, color: AppColors.primaryLight),
                        const SizedBox(width: 8),
                        Text('Your Cart (${cartNotifier.totalItems})', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(ctx).pop()),
                  ],
                ),
                const Divider(color: AppColors.cardBorder),
                if (cart.isEmpty)
                  const Expanded(child: Center(child: Text('Your cart is empty', style: TextStyle(color: AppColors.textMuted))))
                else ...[
                  Expanded(
                    child: ListView.separated(
                      itemCount: cart.length,
                      separatorBuilder: (_, __) => const Divider(color: AppColors.cardBorder, height: 1),
                      itemBuilder: (ctx, i) {
                        final item = cart.values.elementAt(i);
                        final price = item.product.discountPrice ?? item.product.originalPrice;

                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: CachedNetworkImage(
                              imageUrl: item.product.imageUrl,
                              width: 48,
                              height: 48,
                              fit: BoxFit.cover,
                            ),
                          ),
                          title: Text(item.product.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          subtitle: Text('₹${price.toStringAsFixed(2)} each'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: const Icon(Icons.remove_circle_outline, size: 20),
                                onPressed: () => cartNotifier.removeFromCart(item.product.id),
                              ),
                              Text('${item.quantity}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              IconButton(
                                icon: const Icon(Icons.add_circle_outline, size: 20),
                                onPressed: () => cartNotifier.addToCart(item.product.id as dynamic),
                              ),
                            ],
                          ),
                        );
                      },
                    ),
                  ),
                  const Divider(color: AppColors.cardBorder),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Total Amount:', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text('₹${subtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppColors.emerald)),
                    ],
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.chat, size: 20),
                    label: const Text('Order via WhatsApp'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF25D366),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    onPressed: () {
                      Navigator.of(ctx).pop();
                      _sendWhatsAppOrder(cart, subtotal);
                    },
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_isExpired) {
      return Scaffold(
        appBar: AppBar(title: const Text('Store Expired')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.timer_off, size: 64, color: AppColors.amber),
                SizedBox(height: 16),
                Text('Store Expired', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                SizedBox(height: 8),
                Text('This business storefront link has expired.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted)),
              ],
            ),
          ),
        ),
      );
    }

    if (!_isLocationVerified) {
      return Scaffold(
        appBar: AppBar(title: const Text('Location Verification')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.location_off, size: 64, color: AppColors.rose),
                const SizedBox(height: 16),
                const Text('Location Locked', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('This storefront is locked to a physical area. You must be nearby to access.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry Location Check'),
                  onPressed: _loadStoreData,
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(child: Text(_errorMessage!, style: const TextStyle(fontSize: 16))),
      );
    }

    final store = _store!;
    final cart = ref.watch(cartProvider);
    final cartNotifier = ref.read(cartProvider.notifier);

    final filteredProducts = _products.where((p) {
      final matchesCategory = _selectedCategory == 'all' || p.categoryId == _selectedCategory;
      final matchesSearch = _searchQuery.isEmpty || p.name.toLowerCase().contains(_searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    }).toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(store.businessName ?? 'Digital Store'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              final publicUrl = store.storeSlug != null && store.storeSlug!.isNotEmpty
                  ? 'https://connecthub.app/store/${store.storeSlug}'
                  : 'https://connecthub.app/business/${store.publicId}';
              _shareService.shareText(text: 'Visit our store online: $publicUrl');
            },
          ),
        ],
      ),
      body: CustomScrollView(
        slivers: [
          // Store Banner & Info Header
          SliverToBoxAdapter(
            child: Container(
              padding: const EdgeInsets.all(20),
              margin: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      if (store.businessLogoUrl != null && store.businessLogoUrl!.isNotEmpty)
                        ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: CachedNetworkImage(imageUrl: store.businessLogoUrl!, width: 60, height: 60, fit: BoxFit.cover),
                        )
                      else
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(gradient: AppColors.primaryGradient, borderRadius: BorderRadius.circular(12)),
                          child: const Icon(Icons.storefront, size: 30, color: Colors.white),
                        ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(store.businessName ?? 'Store', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                            if (store.businessAddress != null && store.businessAddress!.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text(store.businessAddress!, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                            ],
                            if (store.businessHours != null && store.businessHours!.isNotEmpty) ...[
                              const SizedBox(height: 2),
                              Text('Hours: ${store.businessHours}', style: const TextStyle(fontSize: 11, color: AppColors.emerald, fontWeight: FontWeight.w600)),
                            ],
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: AppColors.cardBorder, height: 24),
                  // Quick Action Buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      if (store.businessPhone != null && store.businessPhone!.isNotEmpty)
                        OutlinedButton.icon(
                          icon: const Icon(Icons.phone, size: 16, color: AppColors.cyan),
                          label: const Text('Call'),
                          onPressed: () => launchUrl(Uri.parse('tel:${store.businessPhone}')),
                        ),
                      if (store.businessWhatsapp != null && store.businessWhatsapp!.isNotEmpty)
                        ElevatedButton.icon(
                          icon: const Icon(Icons.chat, size: 16, color: Colors.white),
                          label: const Text('WhatsApp'),
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF25D366)),
                          onPressed: () {
                            final clean = store.businessWhatsapp!.replaceAll(RegExp(r'[^0-9]'), '');
                            launchUrl(Uri.parse('https://wa.me/$clean'), mode: LaunchMode.externalApplication);
                          },
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Search Bar
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: TextField(
                decoration: const InputDecoration(
                  hintText: 'Search products...',
                  prefixIcon: Icon(Icons.search),
                ),
                onChanged: (val) => setState(() => _searchQuery = val),
              ),
            ),
          ),

          // Categories Filter Tabs
          if (_categories.isNotEmpty)
            SliverToBoxAdapter(
              child: Container(
                height: 40,
                margin: const EdgeInsets.symmetric(vertical: 12),
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  children: [
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: const Text('All Products'),
                        selected: _selectedCategory == 'all',
                        onSelected: (_) => setState(() => _selectedCategory = 'all'),
                      ),
                    ),
                    ..._categories.map((c) => Padding(
                          padding: const EdgeInsets.only(right: 8),
                          child: FilterChip(
                            label: Text(c.name),
                            selected: _selectedCategory == c.id,
                            onSelected: (_) => setState(() => _selectedCategory = c.id),
                          ),
                        )),
                  ],
                ),
              ),
            ),

          // Products Grid
          if (filteredProducts.isEmpty)
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: Text('No products found matching your search', style: TextStyle(color: AppColors.textMuted))),
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverGrid(
                gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                  maxCrossAxisExtent: 220,
                  mainAxisSpacing: 14,
                  crossAxisSpacing: 14,
                  mainAxisExtent: 270,
                ),
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    final prod = filteredProducts[index];
                    final price = prod.discountPrice ?? prod.originalPrice;

                    return Container(
                      decoration: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      clipBehavior: Clip.antiAlias,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: CachedNetworkImage(
                              imageUrl: prod.imageUrl,
                              fit: BoxFit.cover,
                              errorWidget: (_, __, ___) => Container(color: AppColors.surface, child: const Icon(Icons.image)),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.all(10),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(prod.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), maxLines: 1),
                                const SizedBox(height: 2),
                                Row(
                                  children: [
                                    Text('₹${price.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.emerald, fontSize: 14)),
                                    if (prod.discountPrice != null) ...[
                                      const SizedBox(width: 6),
                                      Text('₹${prod.originalPrice.toStringAsFixed(2)}', style: const TextStyle(decoration: TextDecoration.lineThrough, color: AppColors.textMuted, fontSize: 11)),
                                    ],
                                  ],
                                ),
                                const SizedBox(height: 8),
                                ElevatedButton.icon(
                                  icon: const Icon(Icons.add_shopping_cart, size: 14),
                                  label: const Text('Add to Cart', style: TextStyle(fontSize: 12)),
                                  style: ElevatedButton.styleFrom(
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    minimumSize: const Size(double.infinity, 32),
                                  ),
                                  onPressed: () {
                                    cartNotifier.addToCart(prod);
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('Added ${prod.name} to cart'), duration: const Duration(seconds: 1)),
                                    );
                                  },
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                  childCount: filteredProducts.length,
                ),
              ),
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
      bottomNavigationBar: cart.isNotEmpty
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: const Border(top: BorderSide(color: AppColors.cardBorder)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.5), blurRadius: 16, offset: const Offset(0, -4)),
                ],
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${cartNotifier.totalItems} items in cart', style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                        Text('₹${cartNotifier.subtotal.toStringAsFixed(2)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.emerald)),
                      ],
                    ),
                    const Spacer(),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.shopping_bag),
                      label: const Text('View Cart'),
                      onPressed: _showCartSheet,
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}
