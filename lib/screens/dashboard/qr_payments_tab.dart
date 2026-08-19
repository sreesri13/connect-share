import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../models/upi_payment_model.dart';
import '../../providers/upi_provider.dart';
import '../../services/share_export_service.dart';
import '../../services/supabase_service.dart';
import '../../widgets/custom_qr_view.dart';

class QRPaymentsTab extends ConsumerStatefulWidget {
  final String userId;

  const QRPaymentsTab({super.key, required this.userId});

  @override
  ConsumerState<QRPaymentsTab> createState() => _QRPaymentsTabState();
}

class _QRPaymentsTabState extends ConsumerState<QRPaymentsTab> {
  final _supabaseService = SupabaseService();
  final _shareService = ShareExportService();

  static final RegExp _upiIdRegex = RegExp(r'^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$');

  Future<void> _showCreateOrEditDialog([UPIPaymentModel? editingPayment]) async {
    final isEditing = editingPayment != null;
    final upiIdController = TextEditingController(text: editingPayment?.upiId ?? '');
    final nameController = TextEditingController(text: editingPayment?.displayName ?? 'QR Payments');
    final amountController = TextEditingController(
      text: editingPayment?.amount != null ? editingPayment!.amount!.toStringAsFixed(2) : '',
    );
    bool hasFixedAmount = editingPayment?.amount != null;
    String? validationError;

    await showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) {
          return AlertDialog(
            title: Text(isEditing ? 'Edit UPI Payment Profile' : 'Create UPI Payment QR'),
            content: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  TextField(
                    controller: upiIdController,
                    decoration: InputDecoration(
                      labelText: 'UPI ID (VPA)',
                      hintText: 'e.g. yourname@okhdfcbank, business@upi',
                      prefixIcon: const Icon(Icons.currency_rupee),
                      errorText: validationError,
                    ),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Payee Display Name',
                      hintText: 'e.g. My Business / Store Name',
                      prefixIcon: Icon(Icons.person),
                    ),
                  ),
                  const SizedBox(height: 14),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Fixed Payment Amount', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                    subtitle: const Text('Set an exact INR amount for this QR', style: TextStyle(fontSize: 12)),
                    value: hasFixedAmount,
                    onChanged: (val) => setModalState(() => hasFixedAmount = val),
                  ),
                  if (hasFixedAmount) ...[
                    const SizedBox(height: 8),
                    TextField(
                      controller: amountController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Amount (INR ₹)',
                        prefixText: '₹ ',
                      ),
                    ),
                  ],
                ],
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Cancel')),
              ElevatedButton(
                onPressed: () async {
                  final upiId = upiIdController.text.trim();
                  if (upiId.isEmpty || !_upiIdRegex.hasMatch(upiId)) {
                    setModalState(() => validationError = 'Enter a valid UPI ID (e.g. name@upi)');
                    return;
                  }

                  final displayName = nameController.text.trim().isEmpty ? 'QR Payments' : nameController.text.trim();
                  final amount = hasFixedAmount ? double.tryParse(amountController.text.trim()) : null;

                  if (isEditing) {
                    await _supabaseService.updateUPIPayment(
                      id: editingPayment.id,
                      upiId: upiId,
                      displayName: displayName,
                      amount: amount,
                      clearAmount: !hasFixedAmount,
                    );
                  } else {
                    await _supabaseService.createUPIPayment(
                      userId: widget.userId,
                      upiId: upiId,
                      displayName: displayName,
                      amount: amount,
                    );
                  }

                  ref.invalidate(userUPIPaymentsProvider);
                  if (ctx.mounted) Navigator.of(ctx).pop();
                },
                child: Text(isEditing ? 'Save Changes' : 'Generate UPI QR'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final paymentsAsync = ref.watch(userUPIPaymentsProvider);

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: CustomScrollView(
        slivers: [
          // Header
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'UPI Payments & QR',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  ElevatedButton.icon(
                    icon: const Icon(Icons.add, size: 18),
                    label: const Text('Add UPI ID'),
                    onPressed: () => _showCreateOrEditDialog(),
                  ),
                ],
              ),
            ),
          ),

          // Payment List
          paymentsAsync.when(
            data: (payments) {
              if (payments.isEmpty) {
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(40),
                    child: Center(
                      child: Column(
                        children: [
                          const Icon(Icons.currency_rupee, size: 56, color: AppColors.textMuted),
                          const SizedBox(height: 14),
                          const Text('No UPI payment profiles configured', style: TextStyle(color: AppColors.textMuted, fontSize: 15)),
                          const SizedBox(height: 14),
                          ElevatedButton.icon(
                            icon: const Icon(Icons.add),
                            label: const Text('Create Instant UPI Payment QR'),
                            onPressed: () => _showCreateOrEditDialog(),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              return SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      final payment = payments[index];
                      final upiDeepLink = payment.upiDeepLink;

                      return Container(
                        margin: const EdgeInsets.only(bottom: 16),
                        padding: const EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          color: AppColors.card,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: Column(
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // UPI QR Code Preview
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(14),
                                  ),
                                  child: CustomQRView(
                                    data: upiDeepLink,
                                    size: 100,
                                    padding: EdgeInsets.zero,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        payment.displayName,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 17),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        payment.upiId,
                                        style: const TextStyle(fontSize: 13, color: AppColors.primaryLight, fontWeight: FontWeight.w600),
                                      ),
                                      if (payment.amount != null && payment.amount! > 0) ...[
                                        const SizedBox(height: 8),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: AppColors.emerald.withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            'Fixed: ₹${payment.amount!.toStringAsFixed(2)}',
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13,
                                              color: AppColors.emerald,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const Divider(color: AppColors.cardBorder, height: 24),

                            // Action Buttons
                            Row(
                              children: [
                                Expanded(
                                  child: ElevatedButton.icon(
                                    icon: const Icon(Icons.payment, size: 16),
                                    label: const Text('Test Pay'),
                                    onPressed: () async {
                                      final uri = Uri.tryParse(upiDeepLink);
                                      if (uri != null) {
                                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                                      }
                                    },
                                  ),
                                ),
                                const SizedBox(width: 8),
                                OutlinedButton.icon(
                                  icon: const Icon(Icons.share, size: 16),
                                  label: const Text('Share'),
                                  onPressed: () => _shareService.shareText(
                                    text: 'Pay via UPI: $upiDeepLink',
                                    subject: 'UPI Payment - ${payment.displayName}',
                                  ),
                                ),
                                const SizedBox(width: 8),
                                IconButton(
                                  icon: const Icon(Icons.edit_outlined, color: AppColors.textMuted),
                                  onPressed: () => _showCreateOrEditDialog(payment),
                                ),
                                IconButton(
                                  icon: const Icon(Icons.delete_outline, color: AppColors.rose),
                                  onPressed: () async {
                                    await _supabaseService.deleteUPIPayment(payment.id);
                                    ref.invalidate(userUPIPaymentsProvider);
                                  },
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                    childCount: payments.length,
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
