class ScanHistoryModel {
  final String id;
  final String userId;
  final String scannedContent;
  final String contentType;
  final String? title;
  final DateTime scannedAt;

  ScanHistoryModel({
    required this.id,
    required this.userId,
    required this.scannedContent,
    required this.contentType,
    this.title,
    required this.scannedAt,
  });

  factory ScanHistoryModel.fromJson(Map<String, dynamic> json) {
    return ScanHistoryModel(
      id: json['id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      scannedContent: json['scanned_content'] as String? ?? '',
      contentType: json['content_type'] as String? ?? 'url',
      title: json['title'] as String?,
      scannedAt: json['scanned_at'] != null
          ? DateTime.tryParse(json['scanned_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'scanned_content': scannedContent,
      'content_type': contentType,
      'title': title,
      'scanned_at': scannedAt.toIso8601String(),
    };
  }
}

class QRScanLogModel {
  final String id;
  final String? qrPageId;
  final String? qrBusinessPageId;
  final String? deviceType;
  final String? userAgent;
  final String? city;
  final String? country;
  final DateTime scannedAt;

  QRScanLogModel({
    required this.id,
    this.qrPageId,
    this.qrBusinessPageId,
    this.deviceType,
    this.userAgent,
    this.city,
    this.country,
    required this.scannedAt,
  });

  factory QRScanLogModel.fromJson(Map<String, dynamic> json) {
    return QRScanLogModel(
      id: json['id'] as String? ?? '',
      qrPageId: json['qr_page_id'] as String?,
      qrBusinessPageId: json['qr_business_page_id'] as String?,
      deviceType: json['device_type'] as String? ?? 'Mobile',
      userAgent: json['user_agent'] as String?,
      city: json['city'] as String?,
      country: json['country'] as String?,
      scannedAt: json['scanned_at'] != null
          ? DateTime.tryParse(json['scanned_at'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }
}
