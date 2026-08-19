import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:screenshot/screenshot.dart';
import '../../config/theme.dart';
import '../../models/qr_page_model.dart';
import '../../providers/qr_codes_provider.dart';
import '../../services/share_export_service.dart';
import '../../services/supabase_service.dart';
import '../../widgets/access_requests_dialog.dart';
import '../../widgets/custom_qr_view.dart';
import '../../widgets/location_picker_dialog.dart';
import '../public/public_profile_screen.dart';
import '../qr_generator/standalone_qr_screen.dart';

class QRCodesTab extends ConsumerStatefulWidget {
  final String userId;

  const QRCodesTab({super.key, required this.userId});

  @override
  ConsumerState<QRCodesTab> createState() => _QRCodesTabState();
}

class _QRCodesTabState extends ConsumerState<QRCodesTab> {
  final _supabaseService = SupabaseService();
  final _shareService = ShareExportService();
  final ScreenshotController _screenshotController = ScreenshotController();

  Future<void> _showQRModal(QRPageModel page) async {
    final publicUrl = 'https://connecthub.app/p/${page.publicId}';

    await showDialog(
      context: context,
      builder: (ctx) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: Container(
          padding: const EdgeInsets.all(20),
          constraints: const BoxConstraints(maxWidth: 440),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      page.title ?? 'Profile QR Code',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(ctx).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Capture target
              Screenshot(
                controller: _screenshotController,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    children: [
                      CustomQRView(
                        data: publicUrl,
                        styleConfig: page.styleConfig,
                        size: 200,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        publicUrl,
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.open_in_browser, size: 18),
                      label: const Text('Open Profile'),
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => PublicProfileScreen(profileId: page.publicId),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: ElevatedButton.icon(
                      icon: const Icon(Icons.share, size: 18),
                      label: const Text('Share QR'),
                      onPressed: () async {
                        final imageBytes = await _screenshotController.capture();
                        if (imageBytes != null) {
                          await _shareService.shareImage(
                            imageBytes: imageBytes,
                            fileName: 'ConnectHub_${page.publicId}',
                            text: 'View my digital profile: $publicUrl',
                          );
                        }
                      },
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              ElevatedButton.icon(
                icon: const Icon(Icons.picture_as_pdf, size: 18),
                label: const Text('Print Flyer / Card (PDF)'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.card,
                  foregroundColor: AppColors.textPrimary,
                ),
                onPressed: () async {
                  final imageBytes = await _screenshotController.capture();
                  if (imageBytes != null) {
                    await _shareService.exportAndPrintQRFlyer(
                      title: page.title ?? 'Connect with Me',
                      subtitle: 'Scan to connect, browse links & files',
                      qrImageBytes: imageBytes,
                      footerNote: publicUrl,
                    );
                  }
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _showEditQRDialog(QRPageModel page) async {
    final titleController = TextEditingController(text: page.title ?? '');
    final passwordController = TextEditingController();
    bool hasPassword = page.hasPassword;
    bool locationLocked = page.locationLocked;
    double? lat = page.locationLat;
    double? lng = page.locationLng;
    String? locName = page.locationName;
    String scanLimitType = page.scanLimitType;
    int maxScans = page.maxScans ?? 100;
    int dailyLimit = page.dailyLimit ?? 50;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return AlertDialog(
            title: const Text('Edit QR Code Settings'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: titleController,
                    decoration: const InputDecoration(labelText: 'QR Title'),
                  ),
                  const SizedBox(height: 14),

                  // Password Protection
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Password Protection', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    subtitle: const Text('Require visitors to enter a password', style: TextStyle(fontSize: 12)),
                    value: hasPassword,
                    onChanged: (val) => setModalState(() => hasPassword = val),
                  ),
                  if (hasPassword) ...[
                    TextField(
                      controller: passwordController,
                      obscureText: true,
                      decoration: const InputDecoration(
                        labelText: 'New Password (leave blank to keep current)',
                        prefixIcon: Icon(Icons.lock),
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],

                  // Location Lock
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Location Lock', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
                    subtitle: Text(
                      locName != null && locName!.isNotEmpty ? 'Locked to: $locName' : 'Require GPS proximity to view',
                      style: const TextStyle(fontSize: 12),
                    ),
                    value: locationLocked,
                    onChanged: (val) async {
                      if (val) {
                        final loc = await LocationPickerDialog.show(
                          context,
                          initialLat: lat,
                          initialLng: lng,
                          initialName: locName,
                        );
                        if (loc != null) {
                          setModalState(() {
                            locationLocked = true;
                            lat = loc.lat;
                            lng = loc.lng;
                            locName = loc.name;
                          });
                        }
                      } else {
                        setModalState(() {
                          locationLocked = false;
                          lat = null;
                          lng = null;
                          locName = null;
                        });
                      }
                    },
                  ),
                  const SizedBox(height: 10),

                  // Scan Limits
                  DropdownButtonFormField<String>(
                    initialValue: scanLimitType,
                    decoration: const InputDecoration(labelText: 'Scan Limit Type'),
                    items: const [
                      DropdownMenuItem(value: 'unlimited', child: Text('Unlimited Scans')),
                      DropdownMenuItem(value: 'total', child: Text('Total Scan Limit')),
                      DropdownMenuItem(value: 'daily', child: Text('Daily Scan Limit')),
                    ],
                    onChanged: (val) => setModalState(() => scanLimitType = val ?? 'unlimited'),
                  ),
                  if (scanLimitType == 'total') ...[
                    const SizedBox(height: 10),
                    TextFormField(
                      initialValue: maxScans.toString(),
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Max Scans Allowed'),
                      onChanged: (v) => maxScans = int.tryParse(v) ?? 100,
                    ),
                  ],
                  if (scanLimitType == 'daily') ...[
                    const SizedBox(height: 10),
                    TextFormField(
                      initialValue: dailyLimit.toString(),
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Daily Scan Limit'),
                      onChanged: (v) => dailyLimit = int.tryParse(v) ?? 50,
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: () async {
                  await _supabaseService.updateQRPage(
                    id: page.id,
                    title: titleController.text.trim(),
                    password: passwordController.text.trim().isNotEmpty ? passwordController.text.trim() : null,
                    clearPassword: !hasPassword,
                    locationLocked: locationLocked,
                    locationLat: lat,
                    locationLng: lng,
                    locationName: locName,
                    scanLimitType: scanLimitType,
                    maxScans: scanLimitType == 'total' ? maxScans : null,
                    dailyLimit: scanLimitType == 'daily' ? dailyLimit : null,
                  );
                  ref.invalidate(userQRPagesProvider);
                  if (ctx.mounted) Navigator.of(ctx).pop();
                },
                child: const Text('Save Changes'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final qrPagesAsync = ref.watch(userQRPagesProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CustomScrollView(
        slivers: [
          // Header Action
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'My QR Codes',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Create QR'),
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const StandaloneQRScreen()),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // QR Codes Grid / List
          qrPagesAsync.when(
            data: (qrPages) {
              if (qrPages.isEmpty) {
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(40),
                    child: Center(
                      child: Column(
                        children: [
                          const Icon(Icons.qr_code, size: 56, color: AppColors.textMuted),
                          const SizedBox(height: 14),
                          const Text('No QR codes generated yet', style: TextStyle(color: AppColors.textMuted, fontSize: 15)),
                          const SizedBox(height: 14),
                          ElevatedButton.icon(
                            icon: const Icon(Icons.add),
                            label: const Text('Create Your First QR Code'),
                            onPressed: () {
                              Navigator.of(context).push(
                                MaterialPageRoute(builder: (_) => const StandaloneQRScreen()),
                              );
                            },
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              return SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 420,
                    mainAxisSpacing: 16,
                    crossAxisSpacing: 16,
                    mainAxisExtent: 260,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final page = qrPages[index];
                      final publicUrl = 'https://connecthub.app/p/${page.publicId}';
                      final createdDate = page.createdAt != null
                          ? DateFormat('dd MMM yyyy').format(page.createdAt!)
                          : '';

                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              children: [
                                // Thumbnail QR
                                GestureDetector(
                                  onTap: () => _showQRModal(page),
                                  child: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    child: CustomQRView(
                                      data: publicUrl,
                                      styleConfig: page.styleConfig,
                                      size: 64,
                                      padding: EdgeInsets.zero,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        page.title ?? 'Profile QR Code',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      Text(
                                        'Created: $createdDate',
                                        style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                                      ),
                                      const SizedBox(height: 6),
                                      // Status Badges
                                      Wrap(
                                        spacing: 6,
                                        runSpacing: 4,
                                        children: [
                                          if (page.hasPassword)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AppColors.amber.withValues(alpha: 0.2),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: const Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Icon(Icons.lock, size: 10, color: AppColors.amber),
                                                  SizedBox(width: 3),
                                                  Text('Password', style: TextStyle(fontSize: 9, color: AppColors.amber, fontWeight: FontWeight.bold)),
                                                ],
                                              ),
                                            ),
                                          if (page.locationLocked)
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AppColors.cyan.withValues(alpha: 0.2),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: const Row(
                                                mainAxisSize: MainAxisSize.min,
                                                children: [
                                                  Icon(Icons.location_on, size: 10, color: AppColors.cyan),
                                                  SizedBox(width: 3),
                                                  Text('Location Locked', style: TextStyle(fontSize: 9, color: AppColors.cyan, fontWeight: FontWeight.bold)),
                                                ],
                                              ),
                                            ),
                                          if (page.scanLimitType != 'unlimited')
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: AppColors.primaryLight.withValues(alpha: 0.2),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                'Limit: ${page.scanLimitType}',
                                                style: const TextStyle(fontSize: 9, color: AppColors.primaryLight, fontWeight: FontWeight.bold),
                                              ),
                                            ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const Spacer(),
                            const Divider(color: AppColors.cardBorder, height: 16),

                            // Action Toolbar
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceAround,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.qr_code_2, size: 20, color: AppColors.primaryLight),
                                  tooltip: 'View QR Code',
                                  onPressed: () => _showQRModal(page),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, size: 20, color: AppColors.textSecondary),
                                  tooltip: 'Edit Settings',
                                  onPressed: () => _showEditQRDialog(page),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.shield_outlined, size: 20, color: AppColors.textSecondary),
                                  tooltip: 'Access Requests',
                                  onPressed: () => AccessRequestsDialog.show(
                                    context,
                                    qrPageId: page.id,
                                    qrTitle: page.title ?? 'Profile QR',
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, size: 20, color: AppColors.rose),
                                  tooltip: 'Move to Recycle Bin',
                                  onPressed: () async {
                                    await _supabaseService.deleteQRPage(page.id, softDelete: true);
                                    ref.invalidate(userQRPagesProvider);
                                    ref.invalidate(recycleBinQRPagesProvider);
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Moved to Recycle Bin')),
                                      );
                                    }
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                    childCount: qrPages.length,
                  ),
                ),
              );
            },
            loading: () => const SliverToBoxAdapter(child: Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator()))),
            error: (e, _) => SliverToBoxAdapter(child: Text('Error: $e')),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }
}
