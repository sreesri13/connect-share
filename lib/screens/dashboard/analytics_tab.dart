import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../services/analytics_service.dart';

class AnalyticsTab extends StatefulWidget {
  final String userId;

  const AnalyticsTab({super.key, required this.userId});

  @override
  State<AnalyticsTab> createState() => _AnalyticsTabState();
}

class _AnalyticsTabState extends State<AnalyticsTab> {
  final _analyticsService = AnalyticsService();
  String _selectedRange = '7days';
  AnalyticsSummary? _summary;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchAnalytics();
  }

  Future<void> _fetchAnalytics() async {
    setState(() => _isLoading = true);
    try {
      final data = await _analyticsService.fetchUserAnalytics(widget.userId, range: _selectedRange);
      setState(() {
        _summary = data;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Colors.transparent,
        body: Center(child: CircularProgressIndicator()),
      );
    }

    final summary = _summary;
    if (summary == null) {
      return const Scaffold(
        backgroundColor: Colors.transparent,
        body: Center(child: Text('Failed to load analytics')),
      );
    }

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Filter Bar
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Analytics Overview', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                SegmentedButton<String>(
                  segments: const [
                    ButtonSegment(value: 'today', label: Text('Today')),
                    ButtonSegment(value: '7days', label: Text('7D')),
                    ButtonSegment(value: '30days', label: Text('30D')),
                  ],
                  selected: {_selectedRange},
                  onSelectionChanged: (val) {
                    setState(() => _selectedRange = val.first);
                    _fetchAnalytics();
                  },
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Stat Cards Grid
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
              childAspectRatio: 1.5,
              children: [
                _buildStatCard('Total Scans', summary.totalScans.toString(), Icons.qr_code_scanner, AppColors.cyan),
                _buildStatCard('Profile QRs', summary.totalQRCodes.toString(), Icons.qr_code, AppColors.primaryLight),
                _buildStatCard('Business Stores', summary.totalBusinessQR.toString(), Icons.storefront, AppColors.accent),
                _buildStatCard('Payment Profiles', summary.totalPayments.toString(), Icons.currency_rupee, AppColors.emerald),
              ],
            ),
            const SizedBox(height: 20),

            // Scan Trends Chart
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Scan Trends', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 20),
                  SizedBox(
                    height: 180,
                    child: summary.recentScans.isEmpty
                        ? const Center(child: Text('No scans recorded in this period', style: TextStyle(color: AppColors.textMuted)))
                        : BarChart(
                            BarChartData(
                              alignment: BarChartAlignment.spaceAround,
                              maxY: (summary.recentScans.map((e) => e.count).fold(0, (a, b) => a > b ? a : b) + 2).toDouble(),
                              barTouchData: BarTouchData(enabled: true),
                              titlesData: FlTitlesData(
                                show: true,
                                bottomTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    getTitlesWidget: (val, meta) {
                                      final index = val.toInt();
                                      if (index >= 0 && index < summary.recentScans.length) {
                                        return Padding(
                                          padding: const EdgeInsets.only(top: 6),
                                          child: Text(
                                            summary.recentScans[index].label,
                                            style: const TextStyle(fontSize: 10, color: AppColors.textMuted),
                                          ),
                                        );
                                      }
                                      return const SizedBox();
                                    },
                                  ),
                                ),
                                leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                              ),
                              gridData: const FlGridData(show: false),
                              borderData: FlBorderData(show: false),
                              barGroups: summary.recentScans.asMap().entries.map((entry) {
                                return BarChartGroupData(
                                  x: entry.key,
                                  barRods: [
                                    BarChartRodData(
                                      toY: entry.value.count.toDouble(),
                                      color: AppColors.primaryLight,
                                      width: 14,
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
                                    ),
                                  ],
                                );
                              }).toList(),
                            ),
                          ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Top Performing QRs
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.card,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Top Performing QR Codes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  if (summary.topQRCodes.isEmpty)
                    const Text('No QR scans recorded yet', style: TextStyle(color: AppColors.textMuted, fontSize: 13))
                  else
                    ListView.separated(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: summary.topQRCodes.length,
                      separatorBuilder: (_, __) => const Divider(color: AppColors.cardBorder, height: 1),
                      itemBuilder: (ctx, i) {
                        final qr = summary.topQRCodes[i];
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(
                              color: AppColors.primary.withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Icon(qr.type == 'business' ? Icons.storefront : Icons.qr_code, color: AppColors.primaryLight, size: 20),
                          ),
                          title: Text(qr.title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          subtitle: Text(qr.type.toUpperCase(), style: const TextStyle(fontSize: 11, color: AppColors.textMuted)),
                          trailing: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: AppColors.surface,
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: AppColors.cardBorder),
                            ),
                            child: Text('${qr.scans} scans', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
            const SizedBox(height: 80),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 6),
              Expanded(
                child: Text(title, style: const TextStyle(fontSize: 12, color: AppColors.textMuted), maxLines: 1),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        ],
      ),
    );
  }
}
