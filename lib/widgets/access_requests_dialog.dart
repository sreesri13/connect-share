import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../models/access_request_model.dart';
import '../services/supabase_service.dart';

class AccessRequestsDialog extends StatefulWidget {
  final String? qrPageId;
  final String? qrBusinessPageId;
  final String qrTitle;

  const AccessRequestsDialog({
    super.key,
    this.qrPageId,
    this.qrBusinessPageId,
    required this.qrTitle,
  });

  static Future<void> show(
    BuildContext context, {
    String? qrPageId,
    String? qrBusinessPageId,
    required String qrTitle,
  }) {
    return showDialog(
      context: context,
      builder: (ctx) => AccessRequestsDialog(
        qrPageId: qrPageId,
        qrBusinessPageId: qrBusinessPageId,
        qrTitle: qrTitle,
      ),
    );
  }

  @override
  State<AccessRequestsDialog> createState() => _AccessRequestsDialogState();
}

class _AccessRequestsDialogState extends State<AccessRequestsDialog> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _supabaseService = SupabaseService();

  List<QRAccessRequestModel> _requests = [];
  List<QRPermissionModel> _permissions = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final reqs = await _supabaseService.getAccessRequests(
        qrPageId: widget.qrPageId,
        qrBusinessPageId: widget.qrBusinessPageId,
      );
      final perms = await _supabaseService.getPermissions(
        qrPageId: widget.qrPageId,
        qrBusinessPageId: widget.qrBusinessPageId,
      );
      setState(() {
        _requests = reqs;
        _permissions = perms;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _handleApprove(QRAccessRequestModel req) async {
    await _supabaseService.updateAccessRequestStatus(req.id, 'approved');
    await _supabaseService.grantPermission(
      qrPageId: widget.qrPageId,
      qrBusinessPageId: widget.qrBusinessPageId,
      userId: req.userId,
      userEmail: req.userEmail,
      grantedBy: 'Owner',
      role: req.requestedRole,
    );
    _loadData();
  }

  Future<void> _handleReject(QRAccessRequestModel req) async {
    await _supabaseService.updateAccessRequestStatus(req.id, 'rejected');
    _loadData();
  }

  Future<void> _handleRevoke(QRPermissionModel perm) async {
    await _supabaseService.revokePermission(perm.id);
    _loadData();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        padding: const EdgeInsets.all(20),
        constraints: const BoxConstraints(maxWidth: 550, maxHeight: 600),
        child: Column(
          children: [
            Row(
              children: [
                const Icon(Icons.shield, color: AppColors.primaryLight),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Access Management (${widget.qrTitle})',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            TabBar(
              controller: _tabController,
              tabs: [
                Tab(text: 'Pending Requests (${_requests.where((r) => r.status == 'pending').length})'),
                Tab(text: 'Authorized Users (${_permissions.length})'),
              ],
            ),
            const SizedBox(height: 12),
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : TabBarView(
                      controller: _tabController,
                      children: [
                        // Tab 1: Requests
                        _requests.isEmpty
                            ? const Center(child: Text('No pending access requests', style: TextStyle(color: AppColors.textMuted)))
                            : ListView.separated(
                                itemCount: _requests.length,
                                separatorBuilder: (_, __) => const Divider(color: AppColors.cardBorder),
                                itemBuilder: (ctx, i) {
                                  final req = _requests[i];
                                  return ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(req.userEmail, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                    subtitle: Text('Role: ${req.requestedRole} • Status: ${req.status}'),
                                    trailing: req.status == 'pending'
                                        ? Row(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              IconButton(
                                                icon: const Icon(Icons.check, color: AppColors.emerald),
                                                onPressed: () => _handleApprove(req),
                                              ),
                                              IconButton(
                                                icon: const Icon(Icons.close, color: AppColors.rose),
                                                onPressed: () => _handleReject(req),
                                              ),
                                            ],
                                          )
                                        : null,
                                  );
                                },
                              ),

                        // Tab 2: Permissions
                        _permissions.isEmpty
                            ? const Center(child: Text('No authorized users yet', style: TextStyle(color: AppColors.textMuted)))
                            : ListView.separated(
                                itemCount: _permissions.length,
                                separatorBuilder: (_, __) => const Divider(color: AppColors.cardBorder),
                                itemBuilder: (ctx, i) {
                                  final perm = _permissions[i];
                                  return ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(perm.userEmail, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                                    subtitle: Text('Role: ${perm.role}'),
                                    trailing: IconButton(
                                      icon: const Icon(Icons.delete_outline, color: AppColors.rose),
                                      onPressed: () => _handleRevoke(perm),
                                    ),
                                  );
                                },
                              ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
