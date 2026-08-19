import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../models/item_model.dart';
import '../../models/profile_model.dart';
import '../../models/qr_page_model.dart';
import '../../services/location_service.dart';
import '../../services/share_export_service.dart';
import '../../services/supabase_service.dart';
import '../../widgets/file_viewer_dialog.dart';
import '../../widgets/password_prompt_dialog.dart';
import '../../widgets/platform_icon.dart';

class PublicProfileScreen extends StatefulWidget {
  final String profileId;

  const PublicProfileScreen({super.key, required this.profileId});

  @override
  State<PublicProfileScreen> createState() => _PublicProfileScreenState();
}

class _PublicProfileScreenState extends State<PublicProfileScreen> {
  final _supabaseService = SupabaseService();
  final _locationService = LocationService();
  final _shareService = ShareExportService();

  QRPageModel? _qrPage;
  ProfileModel? _profile;
  List<ItemModel> _items = [];
  bool _isLoading = true;
  String? _errorMessage;

  // Security gate states
  bool _isPasswordUnlocked = false;
  bool _isLocationVerified = true;
  bool _isExpired = false;
  bool _isScanLimitReached = false;

  @override
  void initState() {
    super.initState();
    _loadProfileData();
  }

  Future<void> _loadProfileData() async {
    setState(() => _isLoading = true);
    try {
      final qrPage = await _supabaseService.getQRPageByPublicId(widget.profileId);
      if (qrPage == null || qrPage.isDeleted) {
        setState(() {
          _errorMessage = 'Profile not found or has been removed';
          _isLoading = false;
        });
        return;
      }

      // Check Expiry
      if (qrPage.expiresAt != null && qrPage.expiresAt!.isBefore(DateTime.now())) {
        setState(() {
          _qrPage = qrPage;
          _isExpired = true;
          _isLoading = false;
        });
        return;
      }

      // Check Scan Limits
      if (qrPage.scanLimitType == 'total' && qrPage.maxScans != null && qrPage.scanCount >= qrPage.maxScans!) {
        setState(() {
          _qrPage = qrPage;
          _isScanLimitReached = true;
          _isLoading = false;
        });
        return;
      }

      // Check Location Lock
      if (qrPage.locationLocked && qrPage.locationLat != null && qrPage.locationLng != null) {
        final isNear = await _locationService.verifyLocationProximity(
          targetLat: qrPage.locationLat!,
          targetLng: qrPage.locationLng!,
        );
        if (!isNear) {
          setState(() {
            _qrPage = qrPage;
            _isLocationVerified = false;
            _isLoading = false;
          });
          return;
        }
      }

      // Check Password Protection
      if (qrPage.hasPassword && !_isPasswordUnlocked) {
        setState(() {
          _qrPage = qrPage;
          _isLoading = false;
        });
        // Trigger password prompt
        WidgetsBinding.instance.addPostFrameCallback((_) async {
          final unlocked = await PasswordPromptDialog.show(
            context,
            publicId: qrPage.publicId,
            title: qrPage.title ?? 'Profile',
          );
          if (unlocked) {
            setState(() => _isPasswordUnlocked = true);
            _fetchItemsAndLog(qrPage);
          }
        });
        return;
      }

      await _fetchItemsAndLog(qrPage);
    } catch (e) {
      setState(() {
        _errorMessage = 'Error loading profile: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchItemsAndLog(QRPageModel qrPage) async {
    final profile = await _supabaseService.getProfile(qrPage.userId);
    final items = await _supabaseService.getQRPageItems(qrPage.id);

    // Log scan
    _supabaseService.logQRScan(qrPageId: qrPage.id, deviceType: 'Mobile');

    // Handle starred redirect if configured
    if (qrPage.starredItemId != null) {
      final starred = items.where((i) => i.id == qrPage.starredItemId).toList();
      if (starred.isNotEmpty && starred.first.type == ItemType.url) {
        final uri = Uri.tryParse(
          starred.first.content.startsWith('http') ? starred.first.content : 'https://${starred.first.content}',
        );
        if (uri != null) {
          await launchUrl(uri, mode: LaunchMode.externalApplication);
        }
      }
    }

    if (mounted) {
      setState(() {
        _qrPage = qrPage;
        _profile = profile;
        _items = items;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 56, color: AppColors.rose),
                const SizedBox(height: 16),
                Text(_errorMessage!, style: const TextStyle(fontSize: 16, color: AppColors.textPrimary), textAlign: TextAlign.center),
              ],
            ),
          ),
        ),
      );
    }

    if (_isExpired) {
      return Scaffold(
        appBar: AppBar(title: const Text('ConnectHUB')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.timer_off, size: 64, color: AppColors.amber),
                SizedBox(height: 16),
                Text('Link Expired', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                SizedBox(height: 8),
                Text('This QR code link has expired and is no longer accessible.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted)),
              ],
            ),
          ),
        ),
      );
    }

    if (_isScanLimitReached) {
      return Scaffold(
        appBar: AppBar(title: const Text('Scan Limit Reached')),
        body: const Center(
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.block, size: 64, color: AppColors.rose),
                SizedBox(height: 16),
                Text('Scan Limit Reached', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                SizedBox(height: 8),
                Text('This QR code has reached its maximum allowed scan count.', textAlign: TextAlign.center, style: TextStyle(color: AppColors.textMuted)),
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
                Text(
                  'This profile is locked to a specific physical location (${_qrPage?.locationName ?? "designated area"}). You must be nearby to view it.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: AppColors.textMuted),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  icon: const Icon(Icons.refresh),
                  label: const Text('Retry Location Check'),
                  onPressed: _loadProfileData,
                ),
              ],
            ),
          ),
        ),
      );
    }

    if (_qrPage != null && _qrPage!.hasPassword && !_isPasswordUnlocked) {
      return Scaffold(
        appBar: AppBar(title: const Text('Protected Profile')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.lock, size: 64, color: AppColors.primaryLight),
                const SizedBox(height: 16),
                const Text('Password Required', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('Please unlock this profile with the access password.', style: TextStyle(color: AppColors.textMuted)),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  icon: const Icon(Icons.key),
                  label: const Text('Enter Password'),
                  onPressed: () async {
                    final unlocked = await PasswordPromptDialog.show(
                      context,
                      publicId: _qrPage!.publicId,
                      title: _qrPage!.title ?? 'Profile',
                    );
                    if (unlocked) {
                      setState(() => _isPasswordUnlocked = true);
                      _fetchItemsAndLog(_qrPage!);
                    }
                  },
                ),
              ],
            ),
          ),
        ),
      );
    }

    final displayName = _profile?.displayName ?? _qrPage?.title ?? 'Digital Profile';
    final bio = _profile?.bio ?? '';
    final avatarUrl = _profile?.avatarUrl;
    final publicUrl = 'https://connecthub.app/p/${widget.profileId}';

    return Scaffold(
      appBar: AppBar(
        title: const Text('ConnectHUB Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () => _shareService.shareText(
              text: 'View $displayName on ConnectHub: $publicUrl',
            ),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            children: [
              // Profile Header
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 90,
                      height: 90,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: AppColors.primaryGradient,
                        image: avatarUrl != null && avatarUrl.isNotEmpty
                            ? DecorationImage(image: NetworkImage(avatarUrl), fit: BoxFit.cover)
                            : null,
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.4),
                            blurRadius: 20,
                            offset: const Offset(0, 8),
                          ),
                        ],
                      ),
                      child: avatarUrl == null || avatarUrl.isEmpty
                          ? Center(
                              child: Text(
                                displayName.isNotEmpty ? displayName.substring(0, 1).toUpperCase() : 'U',
                                style: const TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            )
                          : null,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      displayName,
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    if (bio.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Text(
                        bio,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.4),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 28),

              // Items List
              if (_items.isEmpty)
                const Center(child: Text('No links or items shared yet.', style: TextStyle(color: AppColors.textMuted)))
              else
                ..._items.map((item) {
                  return Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      leading: Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: PlatformIcon(type: item.type, content: item.content, size: 24),
                      ),
                      title: Text(item.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                      subtitle: Text(
                        item.type == ItemType.wifi ? 'WiFi Access Point' : item.content,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
                      ),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textMuted),
                      onTap: () async {
                        if (item.type == ItemType.url) {
                          final uri = Uri.tryParse(
                            item.content.startsWith('http') ? item.content : 'https://${item.content}',
                          );
                          if (uri != null) {
                            await launchUrl(uri, mode: LaunchMode.externalApplication);
                          }
                        } else {
                          FileViewerDialog.show(context, item);
                        }
                      },
                    ),
                  );
                }),

              const SizedBox(height: 40),
              Center(
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.qr_code, size: 16, color: AppColors.textMuted),
                    const SizedBox(width: 6),
                    const Text('Powered by ConnectHUB', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                  ],
                ),
              ),
              const SizedBox(height: 20),
            ],
          ),
        ),
      ),
    );
  }
}
