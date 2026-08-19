import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../config/theme.dart';
import '../../services/supabase_service.dart';

class PaymentRedirectScreen extends StatefulWidget {
  final String code;

  const PaymentRedirectScreen({super.key, required this.code});

  @override
  State<PaymentRedirectScreen> createState() => _PaymentRedirectScreenState();
}

class _PaymentRedirectScreenState extends State<PaymentRedirectScreen> {
  final _supabaseService = SupabaseService();
  Map<String, dynamic>? _upiData;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _resolveAndRedirect();
  }

  Future<void> _resolveAndRedirect() async {
    setState(() => _isLoading = true);
    try {
      final data = await _supabaseService.resolveUPIByCode(widget.code);
      if (data == null) {
        setState(() {
          _errorMessage = 'Payment link not found or expired';
          _isLoading = false;
        });
        return;
      }

      setState(() {
        _upiData = data;
        _isLoading = false;
      });

      // Auto trigger UPI deep link
      final upiId = data['upi_id'] as String;
      final displayName = data['display_name'] as String? ?? 'Payment';
      final amount = (data['amount'] as num?)?.toDouble();

      final params = <String, String>{
        'pa': upiId.trim(),
        'pn': displayName.trim(),
        'cu': 'INR',
        'tn': 'QR Payment',
        'tr': 'QR-${widget.code}-${DateTime.now().millisecondsSinceEpoch}',
      };
      if (amount != null && amount > 0) {
        params['am'] = amount.toStringAsFixed(2);
      }
      final queryString = params.entries
          .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
          .join('&');
      final upiUri = Uri.parse('upi://pay?$queryString');

      if (await canLaunchUrl(upiUri)) {
        await launchUrl(upiUri, mode: LaunchMode.externalApplication);
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Error resolving payment: $e';
        _isLoading = false;
      });
    }
  }

  void _openUPIApp() async {
    if (_upiData == null) return;
    final upiId = _upiData!['upi_id'] as String;
    final displayName = _upiData!['display_name'] as String? ?? 'Payment';
    final amount = (_upiData!['amount'] as num?)?.toDouble();

    final params = <String, String>{
      'pa': upiId.trim(),
      'pn': displayName.trim(),
      'cu': 'INR',
      'tn': 'QR Payment',
      'tr': 'QR-${widget.code}-${DateTime.now().millisecondsSinceEpoch}',
    };
    if (amount != null && amount > 0) {
      params['am'] = amount.toStringAsFixed(2);
    }
    final queryString = params.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');
    final upiUri = Uri.parse('upi://pay?$queryString');

    await launchUrl(upiUri, mode: LaunchMode.externalApplication);
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Connecting Payment...')),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Opening your UPI payment app...', style: TextStyle(color: AppColors.textMuted)),
            ],
          ),
        ),
      );
    }

    if (_errorMessage != null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Payment Error')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 56, color: AppColors.rose),
                const SizedBox(height: 16),
                Text(_errorMessage!, textAlign: TextAlign.center, style: const TextStyle(fontSize: 16)),
              ],
            ),
          ),
        ),
      );
    }

    final upiId = _upiData!['upi_id'] as String;
    final displayName = _upiData!['display_name'] as String? ?? 'Payment';
    final amount = (_upiData!['amount'] as num?)?.toDouble();

    return Scaffold(
      appBar: AppBar(title: const Text('UPI Payment')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(24),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Column(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.emerald.withValues(alpha: 0.15),
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.currency_rupee, size: 36, color: AppColors.emerald),
                      ),
                      const SizedBox(height: 16),
                      Text(displayName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Text(upiId, style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
                      if (amount != null && amount > 0) ...[
                        const SizedBox(height: 16),
                        Text(
                          '₹${amount.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: AppColors.emerald),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton.icon(
                  icon: const Icon(Icons.payment, size: 20),
                  label: const Text('Open in UPI App (GPay, PhonePe, Paytm)'),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  onPressed: _openUPIApp,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
