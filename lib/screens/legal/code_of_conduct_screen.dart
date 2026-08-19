import 'package:flutter/material.dart';
import '../../config/theme.dart';

class CodeOfConductScreen extends StatelessWidget {
  const CodeOfConductScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Code of Conduct')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 680),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('ConnectHUB Code of Conduct', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('Guidelines for a safe and respectful community', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                const SizedBox(height: 20),
                _buildSection(
                  '1. Respect & Inclusivity',
                  'ConnectHUB is dedicated to providing a harassment-free and inclusive experience for everyone, regardless of gender, sexual orientation, disability, physical appearance, or religion.',
                ),
                _buildSection(
                  '2. Prohibited Content',
                  'Users must not host, publish, or generate QR codes containing illegal materials, hate speech, phishing links, unauthorized copyright infringements, or harmful scripts.',
                ),
                _buildSection(
                  '3. Reporting & Enforcement',
                  'Instances of abusive, harassing, or unacceptable behavior may be reported to the ConnectHUB safety team. Accounts violating these guidelines will be permanently banned.',
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
