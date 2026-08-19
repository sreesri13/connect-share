import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../widgets/app_scaffold.dart';
import '../auth/auth_screen.dart';
import '../demo/demo_screen.dart';
import '../dashboard/qr_scanner_tab.dart';

class LandingScreen extends StatelessWidget {
  const LandingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      isRootScreen: true,
      body: CustomScrollView(
        slivers: [
          // Top Navigation Bar
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          gradient: AppColors.primaryGradient,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.qr_code_2, color: Colors.white, size: 22),
                      ),
                      const SizedBox(width: 10),
                      const Text(
                        'ConnectHUB',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  Row(
                    children: [
                      TextButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const AuthScreen(initialIsSignUp: false)),
                        ),
                        child: const Text('Sign In', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const AuthScreen(initialIsSignUp: true)),
                        ),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        child: const Text('Get Started', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Hero Section
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
              child: Column(
                children: [
                  // Badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(30),
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                    ),
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.auto_awesome, size: 14, color: AppColors.primaryLight),
                        SizedBox(width: 6),
                        Text(
                          'The Future of Digital Networking',
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.primaryLight),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Headline
                  const Text(
                    'Share Your Digital Identity\nWith a Single Scan',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 30,
                      fontWeight: FontWeight.w900,
                      color: AppColors.textPrimary,
                      height: 1.2,
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Subhead
                  const Text(
                    'Create structured digital profiles, organize links and media into categories, and share customized QR codes instantly.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.5),
                  ),
                  const SizedBox(height: 28),

                  // Instant Public Scanner Button
                  Container(
                    width: double.infinity,
                    constraints: const BoxConstraints(maxWidth: 420),
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.qr_code_scanner, color: AppColors.cyan, size: 22),
                      label: const Text(
                        'Scan Any QR Code (Public Camera)',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                      ),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        side: const BorderSide(color: AppColors.cyan, width: 1.5),
                        backgroundColor: AppColors.card,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => Scaffold(
                              appBar: AppBar(title: const Text('QR Code Scanner')),
                              body: const QRScannerTab(userId: ''),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 14),

                  // Action Buttons
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      ElevatedButton.icon(
                        icon: const Icon(Icons.bolt, size: 18),
                        label: const Text('Create Profile'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const AuthScreen(initialIsSignUp: true)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () => Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const DemoScreen()),
                        ),
                        child: const Text('View Demo'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),

          // Interactive Profile Card Showcase
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              child: Center(
                child: Container(
                  constraints: const BoxConstraints(maxWidth: 480),
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: AppColors.card,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.cardBorder),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 30,
                        offset: const Offset(0, 12),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 52,
                            height: 52,
                            decoration: const BoxDecoration(
                              gradient: AppColors.primaryGradient,
                              shape: BoxShape.circle,
                            ),
                            child: const Center(
                              child: Text('JD', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.white)),
                            ),
                          ),
                          const SizedBox(width: 14),
                          const Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('John Doe', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                              Text('Digital Creator & Entrepreneur', style: TextStyle(fontSize: 12, color: AppColors.textMuted)),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 18),
                      _buildPreviewCategory('Social Profiles', ['Twitter / X', 'LinkedIn', 'Instagram']),
                      const SizedBox(height: 10),
                      _buildPreviewCategory('Digital Store', ['Product Catalog', 'Direct WhatsApp Orders']),
                      const SizedBox(height: 10),
                      _buildPreviewCategory('Instant Payment', ['UPI Dynamic Payment QR']),
                    ],
                  ),
                ),
              ),
            ),
          ),

          // Features Grid
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Powerful Features',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 16),
                  _buildFeatureCard(
                    icon: Icons.layers_outlined,
                    title: 'Organized Categories',
                    description: 'Group links, documents, videos, music, and WiFi keys in clean custom categories.',
                  ),
                  const SizedBox(height: 12),
                  _buildFeatureCard(
                    icon: Icons.palette_outlined,
                    title: 'Custom QR Generator',
                    description: 'Customize shapes, eyes, vibrant colors, and embed your business logo inside the QR code.',
                  ),
                  const SizedBox(height: 12),
                  _buildFeatureCard(
                    icon: Icons.storefront_outlined,
                    title: 'QR Business Storefront',
                    description: 'Showcase products with pricing, discounts, and receive direct customer orders on WhatsApp.',
                  ),
                  const SizedBox(height: 12),
                  _buildFeatureCard(
                    icon: Icons.security_outlined,
                    title: 'Advanced Security & Limits',
                    description: 'Protect pages with bcrypt passwords, expiry countdowns, and GPS location proximity locks.',
                  ),
                ],
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 40)),
        ],
      ),
    );
  }

  static Widget _buildPreviewCategory(String title, List<String> items) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder.withValues(alpha: 0.5)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primaryLight)),
          const SizedBox(height: 6),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: items.map((item) => Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Text(item, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
            )).toList(),
          ),
        ],
      ),
    );
  }

  static Widget _buildFeatureCard({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: AppColors.primaryLight, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(description, style: const TextStyle(fontSize: 13, color: AppColors.textMuted, height: 1.4)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
