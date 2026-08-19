import 'qr_page_model.dart';

class BusinessCategoryModel {
  final String id;
  final String userId;
  final String name;
  final int displayOrder;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  BusinessCategoryModel({
    required this.id,
    required this.userId,
    required this.name,
    this.displayOrder = 0,
    this.createdAt,
    this.updatedAt,
  });

  factory BusinessCategoryModel.fromJson(Map<String, dynamic> json) {
    return BusinessCategoryModel(
      id: json['id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      displayOrder: json['display_order'] as int? ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'name': name,
      'display_order': displayOrder,
    };
  }
}

class BusinessProductModel {
  final String id;
  final String userId;
  final String categoryId;
  final String name;
  final String imageUrl;
  final double originalPrice;
  final double? discountPrice;
  final String? description;
  final String status; // active, disabled
  final int displayOrder;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  BusinessProductModel({
    required this.id,
    required this.userId,
    required this.categoryId,
    required this.name,
    required this.imageUrl,
    required this.originalPrice,
    this.discountPrice,
    this.description,
    this.status = 'active',
    this.displayOrder = 0,
    this.createdAt,
    this.updatedAt,
  });

  factory BusinessProductModel.fromJson(Map<String, dynamic> json) {
    return BusinessProductModel(
      id: json['id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      categoryId: json['category_id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      imageUrl: json['image_url'] as String? ?? '',
      originalPrice: (json['original_price'] as num?)?.toDouble() ?? 0.0,
      discountPrice: (json['discount_price'] as num?)?.toDouble(),
      description: json['description'] as String?,
      status: json['status'] as String? ?? 'active',
      displayOrder: json['display_order'] as int? ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'category_id': categoryId,
      'name': name,
      'image_url': imageUrl,
      'original_price': originalPrice,
      'discount_price': discountPrice,
      'description': description,
      'status': status,
      'display_order': displayOrder,
    };
  }
}

class QRBusinessPageModel {
  final String id;
  final String userId;
  final String publicId;
  final String? title;
  final String? businessName;
  final String? businessLogoUrl;
  final String? businessAddress;
  final String? businessPhone;
  final String? businessEmail;
  final String? businessWebsite;
  final String? businessInstagram;
  final String? businessFacebook;
  final String? businessTwitter;
  final String? businessWhatsapp;
  final String? businessHours;
  final String? storeSlug;
  final String? passwordHash;
  final bool hasPassword;
  final DateTime? expiresAt;
  final bool showExpiresAt;
  final bool locationLocked;
  final double? locationLat;
  final double? locationLng;
  final String? locationName;
  final String scanLimitType;
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
  final int productCount;
  final int scanCount;

  QRBusinessPageModel({
    required this.id,
    required this.userId,
    required this.publicId,
    this.title,
    this.businessName,
    this.businessLogoUrl,
    this.businessAddress,
    this.businessPhone,
    this.businessEmail,
    this.businessWebsite,
    this.businessInstagram,
    this.businessFacebook,
    this.businessTwitter,
    this.businessWhatsapp,
    this.businessHours,
    this.storeSlug,
    this.passwordHash,
    this.hasPassword = false,
    this.expiresAt,
    this.showExpiresAt = true,
    this.locationLocked = false,
    this.locationLat,
    this.locationLng,
    this.locationName,
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
    this.productCount = 0,
    this.scanCount = 0,
  });

  factory QRBusinessPageModel.fromJson(Map<String, dynamic> json) {
    return QRBusinessPageModel(
      id: json['id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      publicId: json['public_id'] as String? ?? '',
      title: json['title'] as String?,
      businessName: json['business_name'] as String?,
      businessLogoUrl: json['business_logo_url'] as String?,
      businessAddress: json['business_address'] as String?,
      businessPhone: json['business_phone'] as String?,
      businessEmail: json['business_email'] as String?,
      businessWebsite: json['business_website'] as String?,
      businessInstagram: json['business_instagram'] as String?,
      businessFacebook: json['business_facebook'] as String?,
      businessTwitter: json['business_twitter'] as String?,
      businessWhatsapp: json['business_whatsapp'] as String?,
      businessHours: json['business_hours'] as String?,
      storeSlug: json['store_slug'] as String?,
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
      productCount: json['qr_business_page_products'] != null
          ? (json['qr_business_page_products'] as List).length
          : 0,
      scanCount: json['scan_count'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'public_id': publicId,
      'title': title,
      'business_name': businessName,
      'business_logo_url': businessLogoUrl,
      'business_address': businessAddress,
      'business_phone': businessPhone,
      'business_email': businessEmail,
      'business_website': businessWebsite,
      'business_instagram': businessInstagram,
      'business_facebook': businessFacebook,
      'business_twitter': businessTwitter,
      'business_whatsapp': businessWhatsapp,
      'business_hours': businessHours,
      'store_slug': storeSlug,
      if (passwordHash != null) 'password_hash': passwordHash,
      if (expiresAt != null) 'expires_at': expiresAt!.toIso8601String(),
      'show_expires_at': showExpiresAt,
      'location_locked': locationLocked,
      if (locationLat != null) 'location_lat': locationLat,
      if (locationLng != null) 'location_lng': locationLng,
      if (locationName != null) 'location_name': locationName,
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
