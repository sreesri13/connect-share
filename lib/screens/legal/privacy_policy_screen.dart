import 'package:flutter/material.dart';
import '../../config/theme.dart';

class PrivacyPolicyScreen extends StatelessWidget {
  const PrivacyPolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Privacy Policy')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('ConnectHUB Privacy Policy', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('Last updated: August 2026', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                const SizedBox(height: 20),
                _buildSection(
                  '1. Information We Collect',
                  'We collect information you provide directly to us when creating a profile, generating QR codes, or uploading content (such as names, links, email addresses, and media files). We may also collect device information and scan analytics when a public QR code is scanned.',
                ),
                _buildSection(
                  '2. How We Use Your Information',
                  'We use the information we collect to operate, maintain, and provide the features of the ConnectHUB service, including profile hosting, QR code generation, access control verification, and scan analytics.',
                ),
                _buildSection(
                  '3. Data Storage & Security',
                  'Your data is securely stored using Supabase PostgreSQL databases and cloud storage with row-level security (RLS) policies. Passwords and protected links are hashed using industry standard bcrypt cryptography.',
                ),
                _buildSection(
                  '4. Your Rights & Data Deletion',
                  'You may view, update, or delete your profile information, links, and QR codes at any time from within the application settings. Deleted QR codes are moved to the Recycle Bin and can be permanently purged.',
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
