import 'dart:io';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../models/business_model.dart';
import '../../providers/business_provider.dart';
import '../../services/share_export_service.dart';
import '../../services/storage_service.dart';
import '../../services/supabase_service.dart';
import '../../widgets/custom_qr_view.dart';
import '../public/business_store_screen.dart';

class QRBusinessTab extends ConsumerStatefulWidget {
  final String userId;

  const QRBusinessTab({super.key, required this.userId});

  @override
  ConsumerState<QRBusinessTab> createState() => _QRBusinessTabState();
}

class _QRBusinessTabState extends ConsumerState<QRBusinessTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _supabaseService = SupabaseService();
  final _storageService = StorageService();
  final _shareService = ShareExportService();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  // --- Category Dialog ---
  Future<void> _showAddCategoryDialog([BusinessCategoryModel? cat]) async {
    final controller = TextEditingController(text: cat?.name ?? '');
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(cat != null ? 'Edit Business Category' : 'Add Business Category'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Category Name', hintText: 'e.g. Beverages, Main Course, Apparel'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final name = controller.text.trim();
              if (name.isNotEmpty) {
                if (cat != null) {
                  await _supabaseService.updateBusinessCategory(cat.id, name);
                } else {
                  await _supabaseService.createBusinessCategory(widget.userId, name);
                }
                ref.invalidate(businessCategoriesProvider);
                if (ctx.mounted) Navigator.of(ctx).pop();
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  // --- Product Dialog ---
  Future<void> _showAddProductDialog({required List<BusinessCategoryModel> categories, BusinessProductModel? product}) async {
    if (categories.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please create at least one business category first')),
      );
      return;
    }

    final isEditing = product != null;
    final nameController = TextEditingController(text: product?.name ?? '');
    final originalPriceController = TextEditingController(text: product != null ? product.originalPrice.toStringAsFixed(2) : '');
    final discountPriceController = TextEditingController(text: product?.discountPrice != null ? product!.discountPrice!.toStringAsFixed(2) : '');
    final descriptionController = TextEditingController(text: product?.description ?? '');
    final imageUrlController = TextEditingController(text: product?.imageUrl ?? '');
    String selectedCategoryId = product?.categoryId ?? categories.first.id;
    String status = product?.status ?? 'active';
    bool isUploading = false;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return AlertDialog(
            title: Text(isEditing ? 'Edit Product' : 'Add New Product'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  DropdownButtonFormField<String>(
                    initialValue: selectedCategoryId,
                    decoration: const InputDecoration(labelText: 'Category'),
                    items: categories.map((c) => DropdownMenuItem(value: c.id, child: Text(c.name))).toList(),
                    onChanged: (val) => setModalState(() => selectedCategoryId = val ?? selectedCategoryId),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(labelText: 'Product Name'),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: originalPriceController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(labelText: 'Original Price (₹)', prefixText: '₹'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: discountPriceController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(labelText: 'Discount Price (₹)', prefixText: '₹'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Image Upload
                  ElevatedButton.icon(
                    icon: isUploading
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.photo_camera, size: 18),
                    label: Text(isUploading ? 'Uploading Image...' : 'Upload Product Photo'),
                    onPressed: isUploading
                        ? null
                        : () async {
                            final result = await FilePicker.platform.pickFiles(type: FileType.image);
                            if (result != null && result.files.single.path != null) {
                              setModalState(() => isUploading = true);
                              try {
                                final url = await _storageService.uploadFile(
                                  userId: widget.userId,
                                  file: File(result.files.single.path!),
                                  folder: 'products',
                                );
                                imageUrlController.text = url;
                              } catch (e) {
                                if (ctx.mounted) {
                                  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Upload failed: $e')));
                                }
                              } finally {
                                setModalState(() => isUploading = false);
                              }
                            }
                          },
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: imageUrlController,
                    decoration: const InputDecoration(labelText: 'Image URL', hintText: 'https://...'),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descriptionController,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Description (Optional)'),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: isUploading
                    ? null
                    : () async {
                        final name = nameController.text.trim();
                        final originalPrice = double.tryParse(originalPriceController.text.trim()) ?? 0.0;
                        final discountPrice = double.tryParse(discountPriceController.text.trim());
                        final imageUrl = imageUrlController.text.trim();

                        if (name.isEmpty || originalPrice <= 0 || imageUrl.isEmpty) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            const SnackBar(content: Text('Please fill name, price, and product image')),
                          );
                          return;
                        }

                        if (isEditing) {
                          await _supabaseService.updateBusinessProduct(
                            id: product.id,
                            name: name,
                            categoryId: selectedCategoryId,
                            originalPrice: originalPrice,
                            discountPrice: discountPrice,
                            imageUrl: imageUrl,
                            description: descriptionController.text.trim(),
                            status: status,
                          );
                        } else {
                          await _supabaseService.createBusinessProduct(
                            userId: widget.userId,
                            categoryId: selectedCategoryId,
                            name: name,
                            originalPrice: originalPrice,
                            discountPrice: discountPrice,
                            imageUrl: imageUrl,
                            description: descriptionController.text.trim(),
                            status: status,
                          );
                        }

                        ref.invalidate(businessProductsProvider);
                        if (ctx.mounted) Navigator.of(ctx).pop();
                      },
                child: Text(isEditing ? 'Save Changes' : 'Add Product'),
              ),
            ],
          );
        },
      ),
    );
  }

  // --- Create Storefront QR Dialog ---
  Future<void> _showCreateStorefrontDialog({
    required List<BusinessProductModel> allProducts,
    QRBusinessPageModel? existingStore,
  }) async {
    final isEditing = existingStore != null;
    final nameController = TextEditingController(text: existingStore?.businessName ?? '');
    final titleController = TextEditingController(text: existingStore?.title ?? 'My Store');
    final slugController = TextEditingController(text: existingStore?.storeSlug ?? '');
    final phoneController = TextEditingController(text: existingStore?.businessPhone ?? '');
    final whatsappController = TextEditingController(text: existingStore?.businessWhatsapp ?? '');
    final addressController = TextEditingController(text: existingStore?.businessAddress ?? '');
    final hoursController = TextEditingController(text: existingStore?.businessHours ?? '9:00 AM - 9:00 PM');
    final selectedProductIds = <String>{};

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return AlertDialog(
            title: Text(isEditing ? 'Edit Storefront QR' : 'Create Business Storefront QR'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(controller: nameController, decoration: const InputDecoration(labelText: 'Business Name *')),
                  const SizedBox(height: 10),
                  TextField(controller: slugController, decoration: const InputDecoration(labelText: 'Custom Store Slug (e.g. mystore)', prefixText: 'connecthub.app/store/')),
                  const SizedBox(height: 10),
                  TextField(controller: whatsappController, decoration: const InputDecoration(labelText: 'WhatsApp Number for Orders (with country code)', prefixIcon: Icon(Icons.chat))),
                  const SizedBox(height: 10),
                  TextField(controller: phoneController, decoration: const InputDecoration(labelText: 'Phone Number', prefixIcon: Icon(Icons.phone))),
                  const SizedBox(height: 10),
                  TextField(controller: addressController, decoration: const InputDecoration(labelText: 'Physical Address', prefixIcon: Icon(Icons.place))),
                  const SizedBox(height: 10),
                  TextField(controller: hoursController, decoration: const InputDecoration(labelText: 'Business Hours', prefixIcon: Icon(Icons.access_time))),
                  const SizedBox(height: 14),
                  const Text('Select Products to Display in Store:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 6),
                  if (allProducts.isEmpty)
                    const Text('No products created yet. Add products in the Products tab.', style: TextStyle(fontSize: 12, color: AppColors.textMuted))
                  else
                    ...allProducts.map((prod) => CheckboxListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(prod.name, style: const TextStyle(fontSize: 13)),
                          subtitle: Text('₹${(prod.discountPrice ?? prod.originalPrice).toStringAsFixed(2)}'),
                          value: selectedProductIds.contains(prod.id),
                          onChanged: (val) {
                            setModalState(() {
                              if (val == true) {
                                selectedProductIds.add(prod.id);
                              } else {
                                selectedProductIds.remove(prod.id);
                              }
                            });
                          },
                        )),
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: () async {
                  final bizName = nameController.text.trim();
                  if (bizName.isEmpty) {
                    ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Business Name is required')));
                    return;
                  }

                  if (isEditing) {
                    await _supabaseService.updateQRBusinessPage(
                      id: existingStore.id,
                      businessName: bizName,
                      title: titleController.text.trim(),
                      storeSlug: slugController.text.trim().isNotEmpty ? slugController.text.trim().toLowerCase() : null,
                      businessWhatsapp: whatsappController.text.trim(),
                      businessPhone: phoneController.text.trim(),
                      businessAddress: addressController.text.trim(),
                      businessHours: hoursController.text.trim(),
                      productIds: selectedProductIds.toList(),
                    );
                  } else {
                    await _supabaseService.createQRBusinessPage(
                      userId: widget.userId,
                      businessName: bizName,
                      title: titleController.text.trim(),
                      storeSlug: slugController.text.trim().isNotEmpty ? slugController.text.trim().toLowerCase() : null,
                      businessWhatsapp: whatsappController.text.trim(),
                      businessPhone: phoneController.text.trim(),
                      businessAddress: addressController.text.trim(),
                      businessHours: hoursController.text.trim(),
                      productIds: selectedProductIds.isEmpty ? allProducts.map((p) => p.id).toList() : selectedProductIds.toList(),
                    );
                  }

                  ref.invalidate(qrBusinessPagesProvider);
                  if (ctx.mounted) Navigator.of(ctx).pop();
                },
                child: Text(isEditing ? 'Save Changes' : 'Create Storefront QR'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final categoriesAsync = ref.watch(businessCategoriesProvider);
    final productsAsync = ref.watch(businessProductsProvider);
    final storesAsync = ref.watch(qrBusinessPagesProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(48),
        child: TabBar(
          controller: _tabController,
          indicatorColor: AppColors.primaryLight,
          labelColor: AppColors.textPrimary,
          unselectedLabelColor: AppColors.textMuted,
          tabs: const [
            Tab(text: 'Storefront QRs'),
            Tab(text: 'Products'),
            Tab(text: 'Categories'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // TAB 1: STOREFRONT QRS
          storesAsync.when(
            data: (stores) {
              return productsAsync.when(
                data: (products) {
                  return CustomScrollView(
                    slivers: [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text('My Digital Stores', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              ElevatedButton.icon(
                                icon: const Icon(Icons.add, size: 18),
                                label: const Text('Create Store QR'),
                                onPressed: () => _showCreateStorefrontDialog(allProducts: products),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (stores.isEmpty)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.all(40),
                            child: Center(
                              child: Text('No digital storefronts created yet', style: TextStyle(color: AppColors.textMuted)),
                            ),
                          ),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          sliver: SliverList(
                            delegate: SliverChildBuilderDelegate(
                              (ctx, index) {
                                final store = stores[index];
                                final publicUrl = store.storeSlug != null && store.storeSlug!.isNotEmpty
                                    ? 'https://connecthub.app/store/${store.storeSlug}'
                                    : 'https://connecthub.app/business/${store.publicId}';

                                return Container(
                                  margin: const EdgeInsets.only(bottom: 16),
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: AppColors.card,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: AppColors.cardBorder),
                                  ),
                                  child: Column(
                                    children: [
                                      Row(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.all(8),
                                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                                            child: CustomQRView(data: publicUrl, size: 72, padding: EdgeInsets.zero),
                                          ),
                                          const SizedBox(width: 14),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(store.businessName ?? 'Business Store', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                                                const SizedBox(height: 2),
                                                Text(publicUrl, style: const TextStyle(fontSize: 11, color: AppColors.primaryLight)),
                                                if (store.businessWhatsapp != null && store.businessWhatsapp!.isNotEmpty) ...[
                                                  const SizedBox(height: 4),
                                                  Text('WhatsApp: ${store.businessWhatsapp}', style: const TextStyle(fontSize: 11, color: AppColors.emerald)),
                                                ],
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                      const Divider(color: AppColors.cardBorder, height: 20),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: OutlinedButton.icon(
                                              icon: const Icon(Icons.storefront, size: 16),
                                              label: const Text('Open Store'),
                                              onPressed: () => Navigator.of(context).push(
                                                MaterialPageRoute(
                                                  builder: (_) => BusinessStoreScreen(publicId: store.publicId, storeSlug: store.storeSlug),
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          IconButton(
                                            icon: const Icon(Icons.share, color: AppColors.textSecondary),
                                            onPressed: () => _shareService.shareText(text: 'Visit our store: $publicUrl'),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline, color: AppColors.rose),
                                            onPressed: () async {
                                              await _supabaseService.deleteQRBusinessPage(store.id);
                                              ref.invalidate(qrBusinessPagesProvider);
                                            },
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                );
                              },
                              childCount: stores.length,
                            ),
                          ),
                        ),
                    ],
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Text('Error: $e'),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('Error: $e'),
          ),

          // TAB 2: PRODUCTS
          productsAsync.when(
            data: (products) {
              return categoriesAsync.when(
                data: (categories) {
                  return CustomScrollView(
                    slivers: [
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('Products Catalog (${products.length})', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              ElevatedButton.icon(
                                icon: const Icon(Icons.add, size: 18),
                                label: const Text('Add Product'),
                                onPressed: () => _showAddProductDialog(categories: categories),
                              ),
                            ],
                          ),
                        ),
                      ),
                      if (products.isEmpty)
                        const SliverToBoxAdapter(
                          child: Padding(
                            padding: EdgeInsets.all(40),
                            child: Center(child: Text('No products in catalog yet', style: TextStyle(color: AppColors.textMuted))),
                          ),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          sliver: SliverGrid(
                            gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                              maxCrossAxisExtent: 240,
                              mainAxisSpacing: 14,
                              crossAxisSpacing: 14,
                              mainAxisExtent: 250,
                            ),
                            delegate: SliverChildBuilderDelegate(
                              (ctx, index) {
                                final prod = products[index];
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
                                            Row(
                                              children: [
                                                Text('₹${(prod.discountPrice ?? prod.originalPrice).toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.emerald, fontSize: 13)),
                                                if (prod.discountPrice != null) ...[
                                                  const SizedBox(width: 6),
                                                  Text('₹${prod.originalPrice.toStringAsFixed(2)}', style: const TextStyle(decoration: TextDecoration.lineThrough, color: AppColors.textMuted, fontSize: 11)),
                                                ],
                                              ],
                                            ),
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.end,
                                              children: [
                                                IconButton(
                                                  icon: const Icon(Icons.edit_outlined, size: 16),
                                                  onPressed: () => _showAddProductDialog(categories: categories, product: prod),
                                                ),
                                                IconButton(
                                                  icon: const Icon(Icons.delete_outline, size: 16, color: AppColors.rose),
                                                  onPressed: () async {
                                                    await _supabaseService.deleteBusinessProduct(prod.id);
                                                    ref.invalidate(businessProductsProvider);
                                                  },
                                                ),
                                              ],
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                );
                              },
                              childCount: products.length,
                            ),
                          ),
                        ),
                    ],
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Text('Error: $e'),
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('Error: $e'),
          ),

          // TAB 3: CATEGORIES
          categoriesAsync.when(
            data: (categories) {
              return CustomScrollView(
                slivers: [
                  SliverToBoxAdapter(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Business Categories', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                          ElevatedButton.icon(
                            icon: const Icon(Icons.add, size: 18),
                            label: const Text('Add Category'),
                            onPressed: () => _showAddCategoryDialog(),
                          ),
                        ],
                      ),
                    ),
                  ),
                  SliverPadding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    sliver: SliverList(
                      delegate: SliverChildBuilderDelegate(
                        (ctx, index) {
                          final cat = categories[index];
                          return ListTile(
                            title: Text(cat.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(icon: const Icon(Icons.edit_outlined, size: 18), onPressed: () => _showAddCategoryDialog(cat)),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.rose),
                                  onPressed: () async {
                                    await _supabaseService.deleteBusinessCategory(cat.id);
                                    ref.invalidate(businessCategoriesProvider);
                                  },
                                ),
                              ],
                            ),
                          );
                        },
                        childCount: categories.length,
                      ),
                    ),
                  ),
                ],
              );
            },
            loading: () => const Center(child: CircularProgressIndicator()),
            error: (e, _) => Text('Error: $e'),
          ),
        ],
      ),
    );
  }
}
