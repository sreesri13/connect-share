import 'package:supabase_flutter/supabase_flutter.dart';

class AnalyticsSummary {
  final int totalQRCodes;
  final int totalBusinessQR;
  final int totalPayments;
  final int totalItems;
  final int totalScans;
  final List<ScanChartData> recentScans;
  final List<DeviceBreakdown> deviceBreakdown;
  final List<TopQRCodeData> topQRCodes;

  AnalyticsSummary({
    required this.totalQRCodes,
    required this.totalBusinessQR,
    required this.totalPayments,
    required this.totalItems,
    required this.totalScans,
    required this.recentScans,
    required this.deviceBreakdown,
    required this.topQRCodes,
  });
}

class ScanChartData {
  final String label;
  final int count;

  ScanChartData(this.label, this.count);
}

class DeviceBreakdown {
  final String device;
  final int count;

  DeviceBreakdown(this.device, this.count);
}

class TopQRCodeData {
  final String id;
  final String title;
  final String publicId;
  final String type; // profile, business
  final int scans;

  TopQRCodeData({
    required this.id,
    required this.title,
    required this.publicId,
    required this.type,
    required this.scans,
  });
}

class AnalyticsService {
  final SupabaseClient _supabase = Supabase.instance.client;

  Future<AnalyticsSummary> fetchUserAnalytics(String userId, {String range = '7days'}) async {
    // 1. Fetch user data in parallel
    final results = await Future.wait([
      _supabase.from('qr_pages').select('id, title, public_id').eq('user_id', userId).eq('is_deleted', false),
      _supabase.from('qr_business_pages').select('id, title, business_name, public_id, store_slug').eq('user_id', userId).eq('is_deleted', false),
      _supabase.from('upi_payments').select('id').eq('user_id', userId),
      _supabase.from('items').select('id').eq('user_id', userId),
      _supabase.from('qr_scans').select('id, qr_page_id, qr_business_page_id, device_type, scanned_at'),
    ]);

    final qrPages = results[0] as List;
    final bizPages = results[1] as List;
    final upiPayments = results[2] as List;
    final items = results[3] as List;
    final allScans = results[4] as List;

    final qrCount = qrPages.length;
    final bizCount = bizPages.length;
    final payCount = upiPayments.length;
    final itemCount = items.length;

    final qrPageIds = qrPages.map((p) => p['id'] as String).toSet();
    final bizPageIds = bizPages.map((p) => p['id'] as String).toSet();

    final userScans = allScans.where((s) {
      final qId = s['qr_page_id'] as String?;
      final bId = s['qr_business_page_id'] as String?;
      return (qId != null && qrPageIds.contains(qId)) || (bId != null && bizPageIds.contains(bId));
    }).toList();

    // 2. Date filtering
    final now = DateTime.now();
    final int daysCount = range == 'today' ? 1 : range == '7days' ? 7 : 30;
    final rangeStart = range == 'today'
        ? DateTime(now.year, now.month, now.day)
        : now.subtract(Duration(days: daysCount - 1));

    final filteredScans = userScans.where((s) {
      final scannedAt = DateTime.tryParse(s['scanned_at'] as String? ?? '');
      return scannedAt != null && scannedAt.isAfter(rangeStart);
    }).toList();

    // 3. Build chart data
    final Map<String, int> scanTrends = {};
    if (range == 'today') {
      for (int h = 0; h < 24; h += 3) {
        final label = '${h.toString().padLeft(2, '0')}:00';
        scanTrends[label] = 0;
      }
      for (final s in filteredScans) {
        final scannedAt = DateTime.tryParse(s['scanned_at'] as String? ?? '');
        if (scannedAt != null) {
          final slot = (scannedAt.hour ~/ 3) * 3;
          final label = '${slot.toString().padLeft(2, '0')}:00';
          scanTrends[label] = (scanTrends[label] ?? 0) + 1;
        }
      }
    } else {
      for (int i = daysCount - 1; i >= 0; i--) {
        final d = now.subtract(Duration(days: i));
        final label = '${d.day}/${d.month}';
        scanTrends[label] = 0;
      }
      for (final s in filteredScans) {
        final scannedAt = DateTime.tryParse(s['scanned_at'] as String? ?? '');
        if (scannedAt != null) {
          final label = '${scannedAt.day}/${scannedAt.month}';
          if (scanTrends.containsKey(label)) {
            scanTrends[label] = (scanTrends[label] ?? 0) + 1;
          }
        }
      }
    }

    final recentScans = scanTrends.entries.map((e) => ScanChartData(e.key, e.value)).toList();

    // 4. Device breakdown
    final Map<String, int> deviceCounts = {
      'Mobile': 0,
      'Desktop': 0,
      'Tablet': 0,
    };
    for (final s in userScans) {
      final device = s['device_type'] as String? ?? 'Mobile';
      deviceCounts[device] = (deviceCounts[device] ?? 0) + 1;
    }
    final deviceBreakdown = deviceCounts.entries.map((e) => DeviceBreakdown(e.key, e.value)).toList();

    // 5. Top QR Codes
    final List<TopQRCodeData> topQRs = [];
    for (final p in qrPages) {
      final qId = p['id'] as String;
      final count = userScans.where((s) => s['qr_page_id'] == qId).length;
      topQRs.add(TopQRCodeData(
        id: qId,
        title: p['title'] as String? ?? 'Profile QR',
        publicId: p['public_id'] as String,
        type: 'profile',
        scans: count,
      ));
    }
    for (final b in bizPages) {
      final bId = b['id'] as String;
      final count = userScans.where((s) => s['qr_business_page_id'] == bId).length;
      topQRs.add(TopQRCodeData(
        id: bId,
        title: b['business_name'] as String? ?? b['title'] as String? ?? 'Business Store',
        publicId: b['store_slug'] as String? ?? b['public_id'] as String,
        type: 'business',
        scans: count,
      ));
    }
    topQRs.sort((a, b) => b.scans.compareTo(a.scans));

    return AnalyticsSummary(
      totalQRCodes: qrCount,
      totalBusinessQR: bizCount,
      totalPayments: payCount,
      totalItems: itemCount,
      totalScans: userScans.length,
      recentScans: recentScans,
      deviceBreakdown: deviceBreakdown,
      topQRCodes: topQRs.take(10).toList(),
    );
  }
}
