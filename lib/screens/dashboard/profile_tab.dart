import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../models/category_model.dart';
import '../../models/item_model.dart';
import '../../providers/profile_provider.dart';
import '../../services/storage_service.dart';
import '../../services/supabase_service.dart';
import '../../widgets/file_viewer_dialog.dart';
import '../../widgets/platform_icon.dart';
import '../qr_generator/standalone_qr_screen.dart';

class ProfileTab extends ConsumerStatefulWidget {
  final String userId;

  const ProfileTab({super.key, required this.userId});

  @override
  ConsumerState<ProfileTab> createState() => _ProfileTabState();
}

class _ProfileTabState extends ConsumerState<ProfileTab> {
  final _supabaseService = SupabaseService();
  final _storageService = StorageService();

  Future<void> _showAddCategoryDialog() async {
    final controller = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Add New Category'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(
            hintText: 'e.g. Social Links, Portfolio, Work',
            labelText: 'Category Name',
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final name = controller.text.trim();
              if (name.isNotEmpty) {
                await _supabaseService.createCategory(widget.userId, name);
                ref.invalidate(userCategoriesProvider);
                if (ctx.mounted) Navigator.of(ctx).pop();
              }
            },
            child: const Text('Add Category'),
          ),
        ],
      ),
    );
  }

  Future<void> _showEditCategoryDialog(CategoryModel cat) async {
    final controller = TextEditingController(text: cat.name);
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Edit Category'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(labelText: 'Category Name'),
        ),
        actions: [
          TextButton(
            onPressed: () async {
              await _supabaseService.deleteCategory(cat.id);
              ref.invalidate(userCategoriesProvider);
              ref.invalidate(userItemsProvider);
              if (ctx.mounted) Navigator.of(ctx).pop();
            },
            style: TextButton.styleFrom(foregroundColor: AppColors.rose),
            child: const Text('Delete'),
          ),
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final name = controller.text.trim();
              if (name.isNotEmpty) {
                await _supabaseService.updateCategory(cat.id, name);
                ref.invalidate(userCategoriesProvider);
                if (ctx.mounted) Navigator.of(ctx).pop();
              }
            },
            child: const Text('Save'),
          ),
        ],
      ),
    );
  }

  Future<void> _showAddItemDialog({required String categoryId, ItemModel? editingItem}) async {
    final isEditing = editingItem != null;
    final titleController = TextEditingController(text: editingItem?.title ?? '');
    final contentController = TextEditingController(text: editingItem?.content ?? '');
    ItemType selectedType = editingItem?.type ?? ItemType.url;
    bool isUploading = false;

    // WiFi sub-controllers
    final wifiSsidController = TextEditingController();
    final wifiPassController = TextEditingController();
    String wifiSecurity = 'WPA';

    if (editingItem != null && editingItem.type == ItemType.wifi) {
      wifiSsidController.text = RegExp(r'S:([^;]*)').firstMatch(editingItem.content)?.group(1) ?? '';
      wifiPassController.text = RegExp(r'P:([^;]*)').firstMatch(editingItem.content)?.group(1) ?? '';
      wifiSecurity = RegExp(r'T:([^;]*)').firstMatch(editingItem.content)?.group(1) ?? 'WPA';
    }

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return AlertDialog(
            title: Text(isEditing ? 'Edit Item' : 'Add New Item'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Type dropdown
                  DropdownButtonFormField<ItemType>(
                    initialValue: selectedType,
                    decoration: const InputDecoration(labelText: 'Item Type'),
                    items: ItemType.values.map((t) {
                      return DropdownMenuItem(
                        value: t,
                        child: Text(t.name.toUpperCase()),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) {
                        setModalState(() => selectedType = val);
                      }
                    },
                  ),
                  const SizedBox(height: 14),

                  // Title field
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(
                      labelText: 'Title / Label',
                      hintText: 'e.g. My Website, Resume, Studio WiFi',
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Content input based on type
                  if (selectedType == ItemType.wifi) ...[
                    TextField(
                      controller: wifiSsidController,
                      decoration: const InputDecoration(labelText: 'Network Name (SSID)'),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      initialValue: wifiSecurity,
                      decoration: const InputDecoration(labelText: 'Security'),
                      items: const [
                        DropdownMenuItem(value: 'WPA', child: Text('WPA/WPA2')),
                        DropdownMenuItem(value: 'WEP', child: Text('WEP')),
                        DropdownMenuItem(value: 'nopass', child: Text('No Password')),
                      ],
                      onChanged: (val) => setModalState(() => wifiSecurity = val ?? 'WPA'),
                    ),
                    const SizedBox(height: 10),
                    if (wifiSecurity != 'nopass')
                      TextField(
                        controller: wifiPassController,
                        decoration: const InputDecoration(labelText: 'Password'),
                      ),
                  ] else if (selectedType == ItemType.pdf ||
                      selectedType == ItemType.image ||
                      selectedType == ItemType.video ||
                      selectedType == ItemType.audio ||
                      selectedType == ItemType.largefile) ...[
                    ElevatedButton.icon(
                      icon: isUploading
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.cloud_upload, size: 18),
                      label: Text(isUploading ? 'Uploading file...' : 'Choose File to Upload'),
                      onPressed: isUploading
                          ? null
                          : () async {
                              final result = await FilePicker.platform.pickFiles();
                              if (result != null && result.files.single.path != null) {
                                setModalState(() => isUploading = true);
                                try {
                                  final file = File(result.files.single.path!);
                                  final url = await _storageService.uploadFile(
                                    userId: widget.userId,
                                    file: file,
                                  );
                                  contentController.text = url;
                                  if (titleController.text.isEmpty) {
                                    titleController.text = result.files.single.name;
                                  }
                                } catch (e) {
                                  if (ctx.mounted) {
                                    ScaffoldMessenger.of(ctx).showSnackBar(
                                      SnackBar(content: Text('Upload failed: $e')),
                                    );
                                  }
                                } finally {
                                  setModalState(() => isUploading = false);
                                }
                              }
                            },
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: contentController,
                      decoration: const InputDecoration(
                        labelText: 'File URL / Direct Link',
                        hintText: 'https://...',
                      ),
                    ),
                  ] else if (selectedType == ItemType.text) ...[
                    TextField(
                      controller: contentController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Text Content',
                        hintText: 'Enter text, notes, or code snippet...',
                      ),
                    ),
                  ] else ...[
                    TextField(
                      controller: contentController,
                      decoration: const InputDecoration(
                        labelText: 'URL / Link',
                        hintText: 'https://...',
                      ),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: isUploading
                    ? null
                    : () async {
                        String content = contentController.text.trim();
                        if (selectedType == ItemType.wifi) {
                          content = 'WIFI:S:${wifiSsidController.text.trim()};T:$wifiSecurity;P:${wifiPassController.text.trim()};;';
                        }
                        String title = titleController.text.trim();
                        if (title.isEmpty) {
                          title = selectedType == ItemType.wifi ? (wifiSsidController.text.trim().isNotEmpty ? wifiSsidController.text.trim() : 'WiFi') : 'New Item';
                        }

                        if (content.isEmpty && selectedType != ItemType.wifi) {
                          ScaffoldMessenger.of(ctx).showSnackBar(
                            const SnackBar(content: Text('Please enter content or upload a file')),
                          );
                          return;
                        }

                        if (isEditing) {
                          await _supabaseService.updateItem(
                            id: editingItem.id,
                            title: title,
                            type: selectedType,
                            content: content,
                          );
                        } else {
                          await _supabaseService.createItem(
                            userId: widget.userId,
                            categoryId: categoryId,
                            title: title,
                            type: selectedType,
                            content: content,
                          );
                        }

                        ref.invalidate(userItemsProvider);
                        if (ctx.mounted) Navigator.of(ctx).pop();
                      },
                child: Text(isEditing ? 'Save Changes' : 'Add Item'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final profileAsync = ref.watch(userProfileProvider);
    final categoriesAsync = ref.watch(userCategoriesProvider);
    final itemsAsync = ref.watch(userItemsProvider);
    final selectedItems = ref.watch(selectedItemsForQRProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CustomScrollView(
        slivers: [
          // Profile Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: profileAsync.when(
                data: (profile) {
                  final displayName = profile?.displayName ?? 'My Profile';
                  final bio = profile?.bio ?? 'Add your bio in Settings';
                  final avatarUrl = profile?.avatarUrl;

                  return Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: AppColors.primaryGradient,
                            image: avatarUrl != null && avatarUrl.isNotEmpty
                                ? DecorationImage(image: NetworkImage(avatarUrl), fit: BoxFit.cover)
                                : null,
                          ),
                          child: avatarUrl == null || avatarUrl.isEmpty
                              ? Center(
                                  child: Text(
                                    displayName.isNotEmpty ? displayName.substring(0, 1).toUpperCase() : 'U',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 22, color: Colors.white),
                                  ),
                                )
                              : null,
                        ),
                        const SizedBox(width: 14),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                displayName,
                                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                bio,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
                loading: () => const Center(child: LinearProgressIndicator()),
                error: (e, _) => Text('Error loading profile: $e'),
              ),
            ),
          ),

          // Categories & Add Category Action Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'My Categories & Links',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Add Category'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    onPressed: _showAddCategoryDialog,
                  ),
                ],
              ),
            ),
          ),

          // Categories List
          categoriesAsync.when(
            data: (categories) {
              if (categories.isEmpty) {
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Column(
                        children: [
                          const Icon(Icons.folder_open, size: 48, color: AppColors.textMuted),
                          const SizedBox(height: 12),
                          const Text('No categories created yet', style: TextStyle(color: AppColors.textMuted)),
                          const SizedBox(height: 12),
                          ElevatedButton(
                            onPressed: _showAddCategoryDialog,
                            child: const Text('Create First Category'),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              return itemsAsync.when(
                data: (allItems) {
                  return SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final category = categories[index];
                        final categoryItems = allItems.where((i) => i.categoryId == category.id).toList();

                        return Container(
                          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.card,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.cardBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              // Category Header
                              Padding(
                                padding: const EdgeInsets.fromLTRB(16, 12, 8, 8),
                                child: Row(
                                  children: [
                                    const Icon(Icons.folder, color: AppColors.primaryLight, size: 20),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        category.name,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.textPrimary),
                                      ),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.add_circle_outline, color: AppColors.primaryLight, size: 22),
                                      tooltip: 'Add item to this category',
                                      onPressed: () => _showAddItemDialog(categoryId: category.id),
                                    ),
                                    IconButton(
                                      icon: const Icon(Icons.more_vert, color: AppColors.textMuted, size: 20),
                                      onPressed: () => _showEditCategoryDialog(category),
                                    ),
                                  ],
                                ),
                              ),
                              const Divider(color: AppColors.cardBorder, height: 1),

                              // Items inside category
                              if (categoryItems.isEmpty)
                                const Padding(
                                  padding: EdgeInsets.all(16),
                                  child: Center(
                                    child: Text(
                                      'No items in this category. Tap + to add.',
                                      style: TextStyle(fontSize: 12, color: AppColors.textMuted),
                                    ),
                                  ),
                                )
                              else
                                ListView.separated(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: categoryItems.length,
                                  separatorBuilder: (_, __) => const Divider(color: AppColors.cardBorder, height: 1),
                                  itemBuilder: (ctx, i) {
                                    final item = categoryItems[i];
                                    final isSelected = selectedItems.contains(item.id);

                                    return ListTile(
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 2),
                                      leading: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          Checkbox(
                                            value: isSelected,
                                            activeColor: AppColors.primary,
                                            onChanged: (val) {
                                              final newSet = Set<String>.from(selectedItems);
                                              if (val == true) {
                                                newSet.add(item.id);
                                              } else {
                                                newSet.remove(item.id);
                                              }
                                              ref.read(selectedItemsForQRProvider.notifier).state = newSet;
                                            },
                                          ),
                                          PlatformIcon(type: item.type, content: item.content),
                                        ],
                                      ),
                                      title: Text(
                                        item.title,
                                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      subtitle: Text(
                                        item.content,
                                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      trailing: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          IconButton(
                                            icon: const Icon(Icons.visibility_outlined, size: 18, color: AppColors.textMuted),
                                            onPressed: () => FileViewerDialog.show(context, item),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.edit_outlined, size: 18, color: AppColors.textMuted),
                                            onPressed: () => _showAddItemDialog(categoryId: category.id, editingItem: item),
                                          ),
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.rose),
                                            onPressed: () async {
                                              await _supabaseService.deleteItem(item.id);
                                              ref.invalidate(userItemsProvider);
                                            },
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                ),
                            ],
                          ),
                        );
                      },
                      childCount: categories.length,
                    ),
                  );
                },
                loading: () => const SliverToBoxAdapter(child: Center(child: CircularProgressIndicator())),
                error: (e, _) => SliverToBoxAdapter(child: Text('Error: $e')),
              );
            },
            loading: () => const SliverToBoxAdapter(child: Center(child: CircularProgressIndicator())),
            error: (e, _) => SliverToBoxAdapter(child: Text('Error: $e')),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
      bottomNavigationBar: selectedItems.isNotEmpty
          ? Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.surface,
                border: const Border(top: BorderSide(color: AppColors.cardBorder)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 16, offset: const Offset(0, -4)),
                ],
              ),
              child: SafeArea(
                child: Row(
                  children: [
                    Text(
                      '${selectedItems.length} items selected',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const Spacer(),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.qr_code, size: 18),
                      label: const Text('Generate QR Code'),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => StandaloneQRScreen(selectedItemIds: selectedItems.toList()),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }
}
