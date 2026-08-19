import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';
import '../../providers/profile_provider.dart';
import '../../widgets/app_scaffold.dart';
import '../auth/auth_screen.dart';
import 'analytics_tab.dart';
import 'profile_tab.dart';
import 'qr_business_tab.dart';
import 'qr_codes_tab.dart';
import 'qr_payments_tab.dart';
import 'qr_scanner_tab.dart';
import 'settings_tab.dart';

class DashboardShell extends ConsumerStatefulWidget {
  final int initialTabIndex;

  const DashboardShell({super.key, this.initialTabIndex = 0});

  @override
  ConsumerState<DashboardShell> createState() => _DashboardShellState();
}

class _DashboardShellState extends ConsumerState<DashboardShell> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialTabIndex;
  }

  @override
  Widget build(BuildContext context) {
    final currentUser = ref.watch(currentUserProvider);
    final profileAsync = ref.watch(userProfileProvider);

    if (currentUser == null) {
      return const AuthScreen();
    }

    final userId = currentUser.id;
    final userEmail = currentUser.email ?? '';

    final List<Widget> tabs = [
      ProfileTab(userId: userId),
      QRCodesTab(userId: userId),
      QRScannerTab(userId: userId),
      QRPaymentsTab(userId: userId),
      QRBusinessTab(userId: userId),
      AnalyticsTab(userId: userId),
      SettingsTab(userId: userId, userEmail: userEmail),
    ];

    final List<String> tabTitles = [
      'My Profile',
      'QR Codes',
      'QR Scanner',
      'QR Payments',
      'QR Business',
      'Analytics Dashboard',
      'Settings',
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final isTablet = constraints.maxWidth >= 768;

        if (isTablet) {
          // Tablet Layout with Navigation Rail
          return AppScaffold(
            isRootScreen: true,
            body: Row(
              children: [
                NavigationRail(
                  selectedIndex: _currentIndex,
                  onDestinationSelected: (index) => setState(() => _currentIndex = index),
                  backgroundColor: AppColors.surface,
                  selectedIconTheme: const IconThemeData(color: AppColors.primaryLight),
                  unselectedIconTheme: const IconThemeData(color: AppColors.textMuted),
                  selectedLabelTextStyle: const TextStyle(color: AppColors.primaryLight, fontWeight: FontWeight.bold, fontSize: 13),
                  unselectedLabelTextStyle: const TextStyle(color: AppColors.textMuted, fontSize: 12),
                  leading: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    child: Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.qr_code_2, color: Colors.white, size: 26),
                    ),
                  ),
                  labelType: NavigationRailLabelType.all,
                  destinations: const [
                    NavigationRailDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: Text('Profile')),
                    NavigationRailDestination(icon: Icon(Icons.qr_code_2_outlined), selectedIcon: Icon(Icons.qr_code_2), label: Text('QR Codes')),
                    NavigationRailDestination(icon: Icon(Icons.qr_code_scanner_outlined), selectedIcon: Icon(Icons.qr_code_scanner), label: Text('Scanner')),
                    NavigationRailDestination(icon: Icon(Icons.currency_rupee_outlined), selectedIcon: Icon(Icons.currency_rupee), label: Text('Payments')),
                    NavigationRailDestination(icon: Icon(Icons.storefront_outlined), selectedIcon: Icon(Icons.storefront), label: Text('Business')),
                    NavigationRailDestination(icon: Icon(Icons.bar_chart_outlined), selectedIcon: Icon(Icons.bar_chart), label: Text('Analytics')),
                    NavigationRailDestination(icon: Icon(Icons.settings_outlined), selectedIcon: Icon(Icons.settings), label: Text('Settings')),
                  ],
                ),
                const VerticalDivider(thickness: 1, width: 1, color: AppColors.cardBorder),
                Expanded(
                  child: Scaffold(
                    backgroundColor: Colors.transparent,
                    appBar: AppBar(title: Text(tabTitles[_currentIndex])),
                    body: tabs[_currentIndex],
                  ),
                ),
              ],
            ),
          );
        }

        // Mobile Layout with AppBar, Drawer, and BottomNavigationBar
        return AppScaffold(
          isRootScreen: true,
          appBar: AppBar(
            title: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.qr_code_2, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 8),
                Text(tabTitles[_currentIndex]),
              ],
            ),
          ),
          drawer: Drawer(
            backgroundColor: AppColors.surface,
            child: ListView(
              padding: EdgeInsets.zero,
              children: [
                DrawerHeader(
                  decoration: const BoxDecoration(gradient: AppColors.primaryGradient),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      profileAsync.when(
                        data: (profile) => Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              profile?.displayName ?? 'ConnectHUB User',
                              style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                            Text(
                              userEmail,
                              style: const TextStyle(color: Colors.white70, fontSize: 12),
                            ),
                          ],
                        ),
                        loading: () => const CircularProgressIndicator(color: Colors.white),
                        error: (_, __) => Text(userEmail, style: const TextStyle(color: Colors.white)),
                      ),
                    ],
                  ),
                ),
                ListTile(
                  leading: const Icon(Icons.person),
                  title: const Text('My Profile'),
                  selected: _currentIndex == 0,
                  onTap: () {
                    setState(() => _currentIndex = 0);
                    Navigator.of(context).pop();
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.qr_code_2),
                  title: const Text('QR Codes'),
                  selected: _currentIndex == 1,
                  onTap: () {
                    setState(() => _currentIndex = 1);
                    Navigator.of(context).pop();
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.qr_code_scanner),
                  title: const Text('QR Scanner'),
                  selected: _currentIndex == 2,
                  onTap: () {
                    setState(() => _currentIndex = 2);
                    Navigator.of(context).pop();
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.currency_rupee),
                  title: const Text('QR Payments'),
                  selected: _currentIndex == 3,
                  onTap: () {
                    setState(() => _currentIndex = 3);
                    Navigator.of(context).pop();
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.storefront),
                  title: const Text('QR Business'),
                  selected: _currentIndex == 4,
                  onTap: () {
                    setState(() => _currentIndex = 4);
                    Navigator.of(context).pop();
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.bar_chart),
                  title: const Text('Dashboard Analytics'),
                  selected: _currentIndex == 5,
                  onTap: () {
                    setState(() => _currentIndex = 5);
                    Navigator.of(context).pop();
                  },
                ),
                ListTile(
                  leading: const Icon(Icons.settings),
                  title: const Text('Settings'),
                  selected: _currentIndex == 6,
                  onTap: () {
                    setState(() => _currentIndex = 6);
                    Navigator.of(context).pop();
                  },
                ),
                const Divider(color: AppColors.cardBorder),
                ListTile(
                  leading: const Icon(Icons.logout, color: AppColors.rose),
                  title: const Text('Sign Out', style: TextStyle(color: AppColors.rose)),
                  onTap: () async {
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
              ],
            ),
          ),
          body: tabs[_currentIndex],
          bottomNavigationBar: BottomNavigationBar(
            currentIndex: _currentIndex >= 5 ? 0 : _currentIndex,
            onTap: (index) => setState(() => _currentIndex = index),
            items: const [
              BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
              BottomNavigationBarItem(icon: Icon(Icons.qr_code_2), label: 'QRs'),
              BottomNavigationBarItem(icon: Icon(Icons.qr_code_scanner), label: 'Scanner'),
              BottomNavigationBarItem(icon: Icon(Icons.currency_rupee), label: 'Pay'),
              BottomNavigationBarItem(icon: Icon(Icons.storefront), label: 'Store'),
            ],
          ),
        );
      },
    );
  }
}
