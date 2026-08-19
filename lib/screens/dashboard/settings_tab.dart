import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/app_config.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/profile_provider.dart';
import '../../providers/qr_codes_provider.dart';
import '../../services/storage_service.dart';
import '../../services/supabase_service.dart';
import '../auth/auth_screen.dart';
import '../legal/code_of_conduct_screen.dart';
import '../legal/privacy_policy_screen.dart';
import '../legal/terms_conditions_screen.dart';

class SettingsTab extends ConsumerStatefulWidget {
  final String userId;
  final String userEmail;

  const SettingsTab({super.key, required this.userId, required this.userEmail});

  @override
  ConsumerState<SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends ConsumerState<SettingsTab> {
  final _supabaseService = SupabaseService();
  final _storageService = StorageService();

  final _displayNameController = TextEditingController();
  final _bioController = TextEditingController();
  String? _avatarUrl;
  bool _isSavingProfile = false;
  bool _isUploadingAvatar = false;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    final profile = await _supabaseService.getProfile(widget.userId);
    if (profile != null && mounted) {
      setState(() {
        _displayNameController.text = profile.displayName ?? '';
        _bioController.text = profile.bio ?? '';
        _avatarUrl = profile.avatarUrl;
      });
    }
  }

  Future<void> _saveProfile() async {
    setState(() => _isSavingProfile = true);
    try {
      await _supabaseService.updateProfile(
        userId: widget.userId,
        displayName: _displayNameController.text.trim(),
        bio: _bioController.text.trim(),
        avatarUrl: _avatarUrl,
      );
      ref.invalidate(userProfileProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Profile updated successfully!')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to update profile: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isSavingProfile = false);
    }
  }

  Future<void> _pickAvatar() async {
    final result = await FilePicker.platform.pickFiles(type: FileType.image);
    if (result != null && result.files.single.path != null) {
      setState(() => _isUploadingAvatar = true);
      try {
        final url = await _storageService.uploadFile(
          userId: widget.userId,
          file: File(result.files.single.path!),
          folder: 'avatars',
        );
        setState(() => _avatarUrl = url);
        await _saveProfile();
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Avatar upload failed: $e')),
          );
        }
      } finally {
        if (mounted) setState(() => _isUploadingAvatar = false);
      }
    }
  }

  Future<void> _showChangePasswordDialog() async {
    final passwordController = TextEditingController();
    final confirmController = TextEditingController();
    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Change Password'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: passwordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'New Password'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: confirmController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Confirm New Password'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final newPass = passwordController.text.trim();
              final confirmPass = confirmController.text.trim();
              if (newPass.length < 6) {
                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Password must be at least 6 characters')));
                return;
              }
              if (newPass != confirmPass) {
                ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Passwords do not match')));
                return;
              }

              try {
                final authService = ref.read(authServiceProvider);
                await authService.updatePassword(newPass);
                if (ctx.mounted) {
                  Navigator.of(ctx).pop();
                  ScaffoldMessenger.of(ctx).showSnackBar(const SnackBar(content: Text('Password updated successfully!')));
                }
              } catch (e) {
                if (ctx.mounted) {
                  ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(content: Text('Error: $e')));
                }
              }
            },
            child: const Text('Update Password'),
          ),
        ],
      ),
    );
  }

  Future<void> _showRecycleBinModal() async {
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (ctx) => Consumer(
        builder: (ctx, ref, _) {
          final deletedQRsAsync = ref.watch(recycleBinQRPagesProvider);

          return Container(
            padding: const EdgeInsets.all(20),
            constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.75),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.delete, color: AppColors.rose),
                        SizedBox(width: 8),
                        Text('Recycle Bin (Deleted QRs)', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                      ],
                    ),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.of(ctx).pop()),
                  ],
                ),
                const Divider(color: AppColors.cardBorder),
                Expanded(
                  child: deletedQRsAsync.when(
                    data: (deletedQRs) {
                      if (deletedQRs.isEmpty) {
                        return const Center(
                          child: Text('Recycle bin is empty', style: TextStyle(color: AppColors.textMuted)),
                        );
                      }

                      return ListView.separated(
                        itemCount: deletedQRs.length,
                        separatorBuilder: (_, __) => const Divider(color: AppColors.cardBorder, height: 1),
                        itemBuilder: (ctx, i) {
                          final qr = deletedQRs[i];
                          return ListTile(
                            title: Text(qr.title ?? 'Deleted QR', style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text('ID: ${qr.publicId}'),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                TextButton.icon(
                                  icon: const Icon(Icons.restore, size: 16, color: AppColors.emerald),
                                  label: const Text('Restore', style: TextStyle(color: AppColors.emerald)),
                                  onPressed: () async {
                                    await _supabaseService.restoreQRPage(qr.id);
                                    ref.invalidate(recycleBinQRPagesProvider);
                                    ref.invalidate(userQRPagesProvider);
                                  },
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_forever, size: 20, color: AppColors.rose),
                                  tooltip: 'Permanent Delete',
                                  onPressed: () async {
                                    await _supabaseService.deleteQRPage(qr.id, softDelete: false);
                                    ref.invalidate(recycleBinQRPagesProvider);
                                  },
                                ),
                              ],
                            ),
                          );
                        },
                      );
                    },
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (e, _) => Center(child: Text('Error: $e')),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Profile Edit Box
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Account Profile', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  Center(
                    child: Stack(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: AppColors.primaryGradient,
                            image: _avatarUrl != null && _avatarUrl!.isNotEmpty
                                ? DecorationImage(image: NetworkImage(_avatarUrl!), fit: BoxFit.cover)
                                : null,
                          ),
                          child: _avatarUrl == null || _avatarUrl!.isEmpty
                              ? const Center(child: Icon(Icons.person, size: 40, color: Colors.white))
                              : null,
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: GestureDetector(
                            onTap: _isUploadingAvatar ? null : _pickAvatar,
                            child: Container(
                              padding: const EdgeInsets.all(6),
                              decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                              child: _isUploadingAvatar
                                  ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Icon(Icons.camera_alt, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text('Signed in as: ${widget.userEmail}', style: const TextStyle(fontSize: 12, color: AppColors.textMuted), textAlign: TextAlign.center),
                  const SizedBox(height: 16),
                  TextField(controller: _displayNameController, decoration: const InputDecoration(labelText: 'Display Name')),
                  const SizedBox(height: 12),
                  TextField(controller: _bioController, maxLines: 2, decoration: const InputDecoration(labelText: 'Bio / Description')),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _isSavingProfile ? null : _saveProfile,
                    child: Text(_isSavingProfile ? 'Saving...' : 'Save Profile Changes'),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Security & Settings List
            Container(
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.lock_outline, color: AppColors.primaryLight),
                    title: const Text('Change Password'),
                    trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
                    onTap: _showChangePasswordDialog,
                  ),
                  const Divider(color: AppColors.cardBorder, height: 1),
                  ListTile(
                    leading: const Icon(Icons.delete_sweep_outlined, color: AppColors.rose),
                    title: const Text('Recycle Bin (Deleted QRs)'),
                    trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
                    onTap: _showRecycleBinModal,
                  ),
                  const Divider(color: AppColors.cardBorder, height: 1),
                  ListTile(
                    leading: const Icon(Icons.privacy_tip_outlined, color: AppColors.cyan),
                    title: const Text('Privacy Policy'),
                    trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PrivacyPolicyScreen())),
                  ),
                  const Divider(color: AppColors.cardBorder, height: 1),
                  ListTile(
                    leading: const Icon(Icons.description_outlined, color: AppColors.amber),
                    title: const Text('Terms & Conditions'),
                    trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const TermsConditionsScreen())),
                  ),
                  const Divider(color: AppColors.cardBorder, height: 1),
                  ListTile(
                    leading: const Icon(Icons.verified_user_outlined, color: AppColors.emerald),
                    title: const Text('Code of Conduct'),
                    trailing: const Icon(Icons.chevron_right, color: AppColors.textMuted),
                    onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CodeOfConductScreen())),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Sign Out Button
            OutlinedButton.icon(
              icon: const Icon(Icons.logout, color: AppColors.rose),
              label: const Text('Sign Out', style: TextStyle(color: AppColors.rose, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: AppColors.rose),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: () async {
                final authService = ref.read(authServiceProvider);
                await authService.signOut();
                if (context.mounted) {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const AuthScreen()),
                    (route) => false,
                  );
                }
              },
            ),
            const SizedBox(height: 16),
            const Text(
              'ConnectHUB v${AppConfig.appVersion} (${AppConfig.buildNumber})',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: AppColors.textMuted),
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }
}
