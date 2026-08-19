import 'package:flutter/material.dart';
import '../../config/theme.dart';

class TermsConditionsScreen extends StatelessWidget {
  const TermsConditionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Terms & Conditions')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Terms & Conditions', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('Last updated: August 2026', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                const SizedBox(height: 20),
                _buildSection(
                  '1. Acceptance of Terms',
                  'By accessing or using ConnectHUB (app and website), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.',
                ),
                _buildSection(
                  '2. User Accounts & Security',
                  'You are responsible for safeguarding your account credentials and for all activities that occur under your account. You agree not to upload malicious links, malware, or illegal content.',
                ),
                _buildSection(
                  '3. UPI Payments Disclaimer',
                  'ConnectHUB provides dynamic QR code generation for standard NPCI/UPI deep links. ConnectHUB is not a payment gateway or banking institution and does not hold or process financial transactions directly.',
                ),
                _buildSection(
                  '4. Termination',
                  'We may terminate or suspend access to our service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection(String title, String content) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.primaryLight)),
          const SizedBox(height: 8),
          Text(content, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.5)),
        ],
      ),
    );
  }
}
