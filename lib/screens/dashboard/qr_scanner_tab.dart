import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../models/scan_model.dart';
import '../../services/supabase_service.dart';
import '../public/business_store_screen.dart';
import '../public/public_profile_screen.dart';

class QRScannerTab extends StatefulWidget {
  final String userId;

  const QRScannerTab({super.key, required this.userId});

  @override
  State<QRScannerTab> createState() => _QRScannerTabState();
}

class _QRScannerTabState extends State<QRScannerTab> {
  final MobileScannerController _scannerController = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
    torchEnabled: false,
  );
  final _supabaseService = SupabaseService();
  final _imagePicker = ImagePicker();

  List<ScanHistoryModel> _history = [];
  bool _isLoadingHistory = true;
  bool _isTorchOn = false;
  bool _isProcessing = false;

  @override
  void initState() {
    super.initState();
    if (widget.userId.isNotEmpty) {
      _loadHistory();
    } else {
      _isLoadingHistory = false;
    }
  }

  @override
  void dispose() {
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _loadHistory() async {
    try {
      final items = await _supabaseService.getScanHistory(widget.userId);
      if (mounted) {
        setState(() {
          _history = items;
          _isLoadingHistory = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingHistory = false);
    }
  }

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessing) return;
    final List<Barcode> barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      final String? rawValue = barcode.rawValue;
      if (rawValue != null && rawValue.isNotEmpty) {
        _isProcessing = true;
        _handleScanResult(rawValue);
        break;
      }
    }
  }

  Future<void> _pickImageAndScan() async {
    final image = await _imagePicker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      final result = await _scannerController.analyzeImage(image.path);
      if (result != null && result.barcodes.isNotEmpty) {
        final code = result.barcodes.first.rawValue;
        if (code != null) {
          _handleScanResult(code);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('No QR code found in selected image')),
          );
        }
      }
    }
  }

  Future<void> _handleScanResult(String rawContent) async {
    String contentType = 'text';
    if (rawContent.startsWith('http://') || rawContent.startsWith('https://')) {
      contentType = 'url';
    } else if (rawContent.startsWith('upi://')) {
      contentType = 'payment';
    } else if (rawContent.startsWith('WIFI:')) {
      contentType = 'wifi';
    }

    if (widget.userId.isNotEmpty) {
      await _supabaseService.addScanHistory(
        userId: widget.userId,
        scannedContent: rawContent,
        contentType: contentType,
      );
      _loadHistory();
    }

    // Check if it's a ConnectHub profile or store URL
    final uri = Uri.tryParse(rawContent);
    if (uri != null && uri.pathSegments.isNotEmpty) {
      if (uri.pathSegments.first == 'p' && uri.pathSegments.length > 1) {
        final profileId = uri.pathSegments[1];
        if (mounted) {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (_) => PublicProfileScreen(profileId: profileId)),
          );
          _isProcessing = false;
          return;
        }
      } else if ((uri.pathSegments.first == 'business' || uri.pathSegments.first == 'store') &&
          uri.pathSegments.length > 1) {
        final slugOrId = uri.pathSegments[1];
        if (mounted) {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => BusinessStoreScreen(
                publicId: uri.pathSegments.first == 'business' ? slugOrId : null,
                storeSlug: uri.pathSegments.first == 'store' ? slugOrId : null,
              ),
            ),
          );
          _isProcessing = false;
          return;
        }
      }
    }

    // Show Scan Result Dialog
    if (mounted) {
      await showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Row(
            children: [
              Icon(
                contentType == 'url' ? Icons.link : contentType == 'payment' ? Icons.currency_rupee : Icons.qr_code,
                color: AppColors.primaryLight,
              ),
              const SizedBox(width: 8),
              const Text('Scan Result'),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: SelectableText(
                    rawContent,
                    style: const TextStyle(fontSize: 14, color: AppColors.textPrimary),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton.icon(
              icon: const Icon(Icons.copy, size: 16),
              label: const Text('Copy'),
              onPressed: () {
                Clipboard.setData(ClipboardData(text: rawContent));
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Copied to clipboard!')),
                );
                Navigator.of(ctx).pop();
              },
            ),
            if (contentType == 'url' || contentType == 'payment')
              ElevatedButton.icon(
                icon: const Icon(Icons.open_in_new, size: 16),
                label: Text(contentType == 'payment' ? 'Open UPI App' : 'Open Link'),
                onPressed: () async {
                  final launchUri = Uri.tryParse(rawContent);
                  if (launchUri != null) {
                    await launchUrl(launchUri, mode: LaunchMode.externalApplication);
                  }
                  if (ctx.mounted) Navigator.of(ctx).pop();
                },
              ),
          ],
        ),
      );
      _isProcessing = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Column(
        children: [
          // Live Camera Scanner Box
          Container(
            height: 280,
            margin: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.cardBorder, width: 2),
            ),
            clipBehavior: Clip.antiAlias,
            child: Stack(
              alignment: Alignment.center,
              children: [
                MobileScanner(
                  controller: _scannerController,
                  onDetect: _onDetect,
                ),
                // Overlay Viewfinder
                Container(
                  width: 200,
                  height: 200,
                  decoration: BoxDecoration(
                    border: Border.all(color: AppColors.primaryLight, width: 2.5),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
                // Controls Bar
                Positioned(
                  bottom: 12,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: Icon(_isTorchOn ? Icons.flash_on : Icons.flash_off, color: Colors.white, size: 20),
                          onPressed: () async {
                            await _scannerController.toggleTorch();
                            setState(() => _isTorchOn = !_isTorchOn);
                          },
                        ),
                        IconButton(
                          icon: const Icon(Icons.flip_camera_ios, color: Colors.white, size: 20),
                          onPressed: () => _scannerController.switchCamera(),
                        ),
                        IconButton(
                          icon: const Icon(Icons.photo_library, color: Colors.white, size: 20),
                          tooltip: 'Upload QR Image',
                          onPressed: _pickImageAndScan,
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Scan History Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Recent Scan History',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                if (_history.isNotEmpty)
                  TextButton(
                    onPressed: () async {
                      await _supabaseService.clearScanHistory(widget.userId);
                      _loadHistory();
                    },
                    style: TextButton.styleFrom(foregroundColor: AppColors.rose),
                    child: const Text('Clear All'),
                  ),
              ],
            ),
          ),

          // Scan History List
          Expanded(
            child: _isLoadingHistory
                ? const Center(child: CircularProgressIndicator())
                : _history.isEmpty
                    ? const Center(
                        child: Text(
                          'No recent scans. Point your camera at any QR code.',
                          style: TextStyle(color: AppColors.textMuted, fontSize: 13),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        itemCount: _history.length,
                        separatorBuilder: (_, __) => const Divider(color: AppColors.cardBorder, height: 1),
                        itemBuilder: (ctx, i) {
                          final item = _history[i];
                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: AppColors.primary.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                item.contentType == 'url' ? Icons.link : Icons.qr_code,
                                color: AppColors.primaryLight,
                                size: 20,
                              ),
                            ),
                            title: Text(
                              item.scannedContent,
                              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                              '${item.contentType.toUpperCase()} • ${item.scannedAt.day}/${item.scannedAt.month} ${item.scannedAt.hour}:${item.scannedAt.minute.toString().padLeft(2, '0')}',
                              style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete_outline, color: AppColors.textMuted, size: 18),
                              onPressed: () async {
                                await _supabaseService.deleteScanHistory(item.id);
                                _loadHistory();
                              },
                            ),
                            onTap: () => _handleScanResult(item.scannedContent),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
