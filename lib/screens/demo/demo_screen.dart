import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../models/item_model.dart';
import '../../widgets/file_viewer_dialog.dart';
import '../../widgets/platform_icon.dart';
import '../auth/auth_screen.dart';

class DemoScreen extends StatelessWidget {
  const DemoScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final demoItems = [
      ItemModel(
        id: '1',
        userId: 'demo',
        categoryId: 'social',
        title: 'Twitter / X Profile',
        type: ItemType.url,
        content: 'https://twitter.com/connecthub',
      ),
      ItemModel(
        id: '2',
        userId: 'demo',
        categoryId: 'social',
        title: 'LinkedIn Network',
        type: ItemType.url,
        content: 'https://linkedin.com/in/connecthub',
      ),
      ItemModel(
        id: '3',
        userId: 'demo',
        categoryId: 'social',
        title: 'Instagram Portfolio',
        type: ItemType.url,
        content: 'https://instagram.com/connecthub',
      ),
      ItemModel(
        id: '4',
        userId: 'demo',
        categoryId: 'files',
        title: 'Office WiFi Network',
        type: ItemType.wifi,
        content: 'WIFI:S:ConnectHub_Guest;T:WPA;P:Welcome2026;;',
      ),
      ItemModel(
        id: '5',
        userId: 'demo',
        categoryId: 'files',
        title: 'Developer Notes & Documentation',
        type: ItemType.text,
        content: 'Welcome to ConnectHub! ConnectHub is an all-in-one digital identity and QR code ecosystem.',
      ),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Demo Profile'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => const AuthScreen(initialIsSignUp: true)),
            ),
            child: const Text('Sign Up', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryLight)),
          ),
        ],
      ),
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: ListView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            children: [
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 88,
                      height: 88,
                      decoration: const BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: AppColors.primaryGradient,
                      ),
                      child: const Center(
                        child: Text('JD', style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white)),
                      ),
                    ),
                    const SizedBox(height: 14),
                    const Text('John Doe (Demo)', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    const Text('Product Designer & Tech Explorer • San Francisco, CA', style: TextStyle(fontSize: 13, color: AppColors.textMuted), textAlign: TextAlign.center),
                  ],
                ),
              ),
              const SizedBox(height: 28),

              ...demoItems.map((item) => Container(
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
                        child: PlatformIcon(type: item.type, content: item.content, size: 22),
                      ),
                      title: Text(item.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      subtitle: Text(item.content, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: AppColors.textMuted)),
                      trailing: const Icon(Icons.arrow_forward_ios, size: 14, color: AppColors.textMuted),
                      onTap: () => FileViewerDialog.show(context, item),
                    ),
                  )),

              const SizedBox(height: 32),
              ElevatedButton.icon(
                icon: const Icon(Icons.rocket_launch),
                label: const Text('Create Your Own ConnectHUB Profile'),
                style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const AuthScreen(initialIsSignUp: true)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
