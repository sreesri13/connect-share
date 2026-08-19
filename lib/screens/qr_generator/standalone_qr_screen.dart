import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:screenshot/screenshot.dart';
import '../../config/theme.dart';
import '../../models/qr_page_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/qr_codes_provider.dart';
import '../../services/qr_style_service.dart';
import '../../services/share_export_service.dart';
import '../../services/supabase_service.dart';
import '../../widgets/custom_qr_view.dart';
import '../../widgets/location_picker_dialog.dart';

class StandaloneQRScreen extends ConsumerStatefulWidget {
  final List<String>? selectedItemIds;

  const StandaloneQRScreen({super.key, this.selectedItemIds});

  @override
  ConsumerState<StandaloneQRScreen> createState() => _StandaloneQRScreenState();
}

class _StandaloneQRScreenState extends ConsumerState<StandaloneQRScreen> {
  final _supabaseService = SupabaseService();
  final _shareService = ShareExportService();
  final ScreenshotController _screenshotController = ScreenshotController();

  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  final _passwordController = TextEditingController();

  QRStyleConfig _styleConfig = const QRStyleConfig();
  bool _enablePassword = false;
  bool _enableLocationLock = false;
  double? _lat;
  double? _lng;
  String? _locName;
  String _scanLimitType = 'unlimited';
  int _maxScans = 100;
  int _dailyLimit = 50;

  bool _isGenerating = false;
  QRPageModel? _createdQRPage;

  @override
  void initState() {
    super.initState();
    if (widget.selectedItemIds != null && widget.selectedItemIds!.isNotEmpty) {
      _titleController.text = 'My Shared Items';
    } else {
      _contentController.text = 'https://connecthub.app';
    }
  }

  String _buildPreviewData() {
    if (widget.selectedItemIds != null && widget.selectedItemIds!.isNotEmpty) {
      return _createdQRPage != null
          ? 'https://connecthub.app/p/${_createdQRPage!.publicId}'
          : 'https://connecthub.app/p/preview';
    }
    return _contentController.text.trim().isEmpty ? 'https://connecthub.app' : _contentController.text.trim();
  }

  Future<void> _handleSaveAndGenerate() async {
    final user = ref.read(currentUserProvider);
    if (user == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please sign in to save your QR code')),
      );
      return;
    }

    setState(() => _isGenerating = true);
    try {
      final page = await _supabaseService.createQRPage(
        userId: user.id,
        title: _titleController.text.trim().isEmpty ? 'My QR Code' : _titleController.text.trim(),
        itemIds: widget.selectedItemIds ?? [],
        styleConfig: _styleConfig,
        password: _enablePassword && _passwordController.text.trim().isNotEmpty ? _passwordController.text.trim() : null,
        locationLocked: _enableLocationLock,
        locationLat: _lat,
        locationLng: _lng,
        locationName: _locName,
        scanLimitType: _scanLimitType,
        maxScans: _scanLimitType == 'total' ? _maxScans : null,
        dailyLimit: _scanLimitType == 'daily' ? _dailyLimit : null,
      );

      ref.invalidate(userQRPagesProvider);

      setState(() {
        _createdQRPage = page;
        _isGenerating = false;
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('QR Code created and saved successfully!')),
        );
      }
    } catch (e) {
      setState(() => _isGenerating = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save QR code: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final previewData = _buildPreviewData();
    final contrastWarning = QRStyleService.getContrastWarning(_styleConfig.bodyColor, _styleConfig.backgroundColor);

    return Scaffold(
      appBar: AppBar(title: const Text('QR Code Studio')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 540),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Live QR Code Preview
                Center(
                  child: Screenshot(
                    controller: _screenshotController,
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: AppColors.card,
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Column(
                        children: [
                          CustomQRView(
                            data: previewData,
                            styleConfig: _styleConfig,
                            size: 200,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            previewData,
                            style: const TextStyle(fontSize: 11, color: AppColors.textMuted),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                if (contrastWarning != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.amber.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: AppColors.amber.withValues(alpha: 0.3)),
                    ),
                    child: Text(contrastWarning, style: const TextStyle(fontSize: 12, color: AppColors.amber), textAlign: TextAlign.center),
                  ),
                ],
                const SizedBox(height: 24),

                // Presets Bar
                const Text('Style Themes & Presets', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 10),
                SizedBox(
                  height: 42,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: QRStyleService.presets.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 8),
                    itemBuilder: (ctx, i) {
                      final preset = QRStyleService.presets[i];
                      final isSelected = _styleConfig.bodyColor == preset.config.bodyColor &&
                          _styleConfig.bodyShape == preset.config.bodyShape;

                      return ChoiceChip(
                        label: Text(preset.name),
                        selected: isSelected,
                        onSelected: (_) => setState(() => _styleConfig = preset.config),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 24),

                // Content & Title
                const Text('Content & Configuration', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextField(
                  controller: _titleController,
                  decoration: const InputDecoration(labelText: 'QR Title', hintText: 'e.g. My Website, Portfolio'),
                ),
                if (widget.selectedItemIds == null || widget.selectedItemIds!.isEmpty) ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: _contentController,
                    decoration: const InputDecoration(labelText: 'Destination URL / Content', hintText: 'https://...'),
                    onChanged: (_) => setState(() {}),
                  ),
                ],
                const SizedBox(height: 20),

                // Security & Location Lock
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Column(
                    children: [
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Password Protection', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        value: _enablePassword,
                        onChanged: (v) => setState(() => _enablePassword = v),
                      ),
                      if (_enablePassword) ...[
                        TextField(
                          controller: _passwordController,
                          obscureText: true,
                          decoration: const InputDecoration(labelText: 'Set Password'),
                        ),
                        const SizedBox(height: 10),
                      ],
                      SwitchListTile(
                        contentPadding: EdgeInsets.zero,
                        title: const Text('Location Lock (GPS Proximity)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                        subtitle: Text(_locName ?? 'Require visitor to be physically near coordinate', style: const TextStyle(fontSize: 12)),
                        value: _enableLocationLock,
                        onChanged: (v) async {
                          if (v) {
                            final loc = await LocationPickerDialog.show(context);
                            if (loc != null) {
                              setState(() {
                                _enableLocationLock = true;
                                _lat = loc.lat;
                                _lng = loc.lng;
                                _locName = loc.name;
                              });
                            }
                          } else {
                            setState(() {
                              _enableLocationLock = false;
                              _lat = null;
                              _lng = null;
                              _locName = null;
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 8),
                      DropdownButtonFormField<String>(
                        initialValue: _scanLimitType,
                        decoration: const InputDecoration(labelText: 'Scan Limit Type'),
                        items: const [
                          DropdownMenuItem(value: 'unlimited', child: Text('Unlimited Scans')),
                          DropdownMenuItem(value: 'total', child: Text('Total Lifetime Scans')),
                          DropdownMenuItem(value: 'daily', child: Text('Daily Scan Limit')),
                        ],
                        onChanged: (val) {
                          if (val != null) setState(() => _scanLimitType = val);
                        },
                      ),
                      if (_scanLimitType == 'total') ...[
                        const SizedBox(height: 8),
                        TextFormField(
                          initialValue: '$_maxScans',
                          decoration: const InputDecoration(labelText: 'Max Scans Allowed'),
                          keyboardType: TextInputType.number,
                          onChanged: (v) => _maxScans = int.tryParse(v) ?? 100,
                        ),
                      ],
                      if (_scanLimitType == 'daily') ...[
                        const SizedBox(height: 8),
                        TextFormField(
                          initialValue: '$_dailyLimit',
                          decoration: const InputDecoration(labelText: 'Daily Scan Limit'),
                          keyboardType: TextInputType.number,
                          onChanged: (v) => _dailyLimit = int.tryParse(v) ?? 50,
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Save & Generate Button
                ElevatedButton.icon(
                  icon: _isGenerating
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.check_circle_outline),
                  label: Text(_isGenerating ? 'Generating...' : 'Save & Publish QR Code'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _isGenerating ? null : _handleSaveAndGenerate,
                ),
                const SizedBox(height: 12),

                // Share & PDF Print Actions
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.share, size: 18),
                        label: const Text('Share Image'),
                        onPressed: () async {
                          final bytes = await _screenshotController.capture();
                          if (bytes != null) {
                            await _shareService.shareImage(
                              imageBytes: bytes,
                              fileName: 'ConnectHub_QR',
                              text: 'Scan my ConnectHub QR code: $previewData',
                            );
                          }
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.picture_as_pdf, size: 18),
                        label: const Text('Print PDF Flyer'),
                        onPressed: () async {
                          final bytes = await _screenshotController.capture();
                          if (bytes != null) {
                            await _shareService.exportAndPrintQRFlyer(
                              title: _titleController.text.trim().isEmpty ? 'ConnectHUB' : _titleController.text.trim(),
                              subtitle: 'Scan with camera or UPI app to view',
                              qrImageBytes: bytes,
                              footerNote: previewData,
                            );
                          }
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
