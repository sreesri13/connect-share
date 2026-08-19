class QRStyleConfig {
  final String bodyShape; // square, dots, rounded, diamond, star
  final String eyeFrameShape; // square, rounded, circle, leaf, dotted
  final String eyeBallShape; // square, rounded, circle, diamond, leaf
  final String bodyColor;
  final String eyeFrameColor;
  final String eyeBallColor;
  final String backgroundColor;
  final double size;
  final double margin;
  final String errorCorrectionLevel; // L, M, Q, H
  final String? logoUrl;
  final String logoSize; // small, medium, large

  const QRStyleConfig({
    this.bodyShape = 'square',
    this.eyeFrameShape = 'square',
    this.eyeBallShape = 'square',
    this.bodyColor = '#000000',
    this.eyeFrameColor = '#000000',
    this.eyeBallColor = '#000000',
    this.backgroundColor = '#ffffff',
    this.size = 200,
    this.margin = 4,
    this.errorCorrectionLevel = 'H',
    this.logoUrl,
    this.logoSize = 'medium',
  });

  factory QRStyleConfig.fromJson(Map<String, dynamic>? json) {
    if (json == null) return const QRStyleConfig();
    return QRStyleConfig(
      bodyShape: json['bodyShape'] as String? ?? 'square',
      eyeFrameShape: json['eyeFrameShape'] as String? ?? 'square',
      eyeBallShape: json['eyeBallShape'] as String? ?? 'square',
      bodyColor: json['bodyColor'] as String? ?? '#000000',
      eyeFrameColor: json['eyeFrameColor'] as String? ?? '#000000',
      eyeBallColor: json['eyeBallColor'] as String? ?? '#000000',
      backgroundColor: json['backgroundColor'] as String? ?? '#ffffff',
      size: (json['size'] as num?)?.toDouble() ?? 200,
      margin: (json['margin'] as num?)?.toDouble() ?? 4,
      errorCorrectionLevel: json['errorCorrectionLevel'] as String? ?? 'H',
      logoUrl: json['logoUrl'] as String?,
      logoSize: json['logoSize'] as String? ?? 'medium',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'bodyShape': bodyShape,
      'eyeFrameShape': eyeFrameShape,
      'eyeBallShape': eyeBallShape,
      'bodyColor': bodyColor,
      'eyeFrameColor': eyeFrameColor,
      'eyeBallColor': eyeBallColor,
      'backgroundColor': backgroundColor,
      'size': size,
      'margin': margin,
      'errorCorrectionLevel': errorCorrectionLevel,
      if (logoUrl != null) 'logoUrl': logoUrl,
      'logoSize': logoSize,
    };
  }

  QRStyleConfig copyWith({
    String? bodyShape,
    String? eyeFrameShape,
    String? eyeBallShape,
    String? bodyColor,
    String? eyeFrameColor,
    String? eyeBallColor,
    String? backgroundColor,
    double? size,
    double? margin,
    String? errorCorrectionLevel,
    String? logoUrl,
    String? logoSize,
  }) {
    return QRStyleConfig(
      bodyShape: bodyShape ?? this.bodyShape,
      eyeFrameShape: eyeFrameShape ?? this.eyeFrameShape,
      eyeBallShape: eyeBallShape ?? this.eyeBallShape,
      bodyColor: bodyColor ?? this.bodyColor,
      eyeFrameColor: eyeFrameColor ?? this.eyeFrameColor,
      eyeBallColor: eyeBallColor ?? this.eyeBallColor,
      backgroundColor: backgroundColor ?? this.backgroundColor,
      size: size ?? this.size,
      margin: margin ?? this.margin,
      errorCorrectionLevel: errorCorrectionLevel ?? this.errorCorrectionLevel,
      logoUrl: logoUrl ?? this.logoUrl,
      logoSize: logoSize ?? this.logoSize,
    );
  }
}

class QRPageModel {
  final String id;
  final String userId;
  final String publicId;
  final String? title;
  final String? passwordHash;
  final bool hasPassword;
  final DateTime? expiresAt;
  final bool showExpiresAt;
  final bool locationLocked;
  final double? locationLat;
  final double? locationLng;
  final String? locationName;
  final String? starredItemId;
  final String scanLimitType; // unlimited, total, daily
  final int? maxScans;
  final int? dailyLimit;
  final bool publicView;
  final bool allowRequests;
  final bool showInstallPopup;
  final bool showFooterBranding;
  final bool isDeleted;
  final DateTime? deletedAt;
  final QRStyleConfig styleConfig;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final int itemCount;
  final int scanCount;

  QRPageModel({
    required this.id,
    required this.userId,
    required this.publicId,
    this.title,
    this.passwordHash,
    this.hasPassword = false,
    this.expiresAt,
    this.showExpiresAt = true,
    this.locationLocked = false,
    this.locationLat,
    this.locationLng,
    this.locationName,
    this.starredItemId,
    this.scanLimitType = 'unlimited',
    this.maxScans,
    this.dailyLimit,
    this.publicView = true,
    this.allowRequests = false,
    this.showInstallPopup = true,
    this.showFooterBranding = true,
    this.isDeleted = false,
    this.deletedAt,
    this.styleConfig = const QRStyleConfig(),
    this.createdAt,
    this.updatedAt,
    this.itemCount = 0,
    this.scanCount = 0,
  });

  factory QRPageModel.fromJson(Map<String, dynamic> json) {
    return QRPageModel(
      id: json['id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      publicId: json['public_id'] as String? ?? '',
      title: json['title'] as String?,
      passwordHash: json['password_hash'] as String?,
      hasPassword: json['password_hash'] != null &&
          (json['password_hash'] as String).isNotEmpty,
      expiresAt: json['expires_at'] != null
          ? DateTime.tryParse(json['expires_at'] as String)
          : null,
      showExpiresAt: json['show_expires_at'] as bool? ?? true,
      locationLocked: json['location_locked'] as bool? ?? false,
      locationLat: (json['location_lat'] as num?)?.toDouble(),
      locationLng: (json['location_lng'] as num?)?.toDouble(),
      locationName: json['location_name'] as String?,
      starredItemId: json['starred_item_id'] as String?,
      scanLimitType: json['scan_limit_type'] as String? ?? 'unlimited',
      maxScans: json['max_scans'] as int?,
      dailyLimit: json['daily_limit'] as int?,
      publicView: json['public_view'] as bool? ?? true,
      allowRequests: json['allow_requests'] as bool? ?? false,
      showInstallPopup: json['show_install_popup'] as bool? ?? true,
      showFooterBranding: json['show_footer_branding'] as bool? ?? true,
      isDeleted: json['is_deleted'] as bool? ?? false,
      deletedAt: json['deleted_at'] != null
          ? DateTime.tryParse(json['deleted_at'] as String)
          : null,
      styleConfig: json['style_config'] != null
          ? QRStyleConfig.fromJson(
              json['style_config'] as Map<String, dynamic>)
          : const QRStyleConfig(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
      itemCount: json['qr_page_items'] != null
          ? (json['qr_page_items'] as List).length
          : 0,
      scanCount: json['scan_count'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'public_id': publicId,
      'title': title,
      if (passwordHash != null) 'password_hash': passwordHash,
      if (expiresAt != null) 'expires_at': expiresAt!.toIso8601String(),
      'show_expires_at': showExpiresAt,
      'location_locked': locationLocked,
      if (locationLat != null) 'location_lat': locationLat,
      if (locationLng != null) 'location_lng': locationLng,
      if (locationName != null) 'location_name': locationName,
      if (starredItemId != null) 'starred_item_id': starredItemId,
      'scan_limit_type': scanLimitType,
      if (maxScans != null) 'max_scans': maxScans,
      if (dailyLimit != null) 'daily_limit': dailyLimit,
      'public_view': publicView,
      'allow_requests': allowRequests,
      'show_install_popup': showInstallPopup,
      'show_footer_branding': showFooterBranding,
      'style_config': styleConfig.toJson(),
    };
  }
}
