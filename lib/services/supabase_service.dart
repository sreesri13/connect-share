import 'dart:math';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/profile_model.dart';
import '../models/category_model.dart';
import '../models/item_model.dart';
import '../models/qr_page_model.dart';
import '../models/business_model.dart';
import '../models/upi_payment_model.dart';
import '../models/scan_model.dart';
import '../models/access_request_model.dart';

class SupabaseService {
  final SupabaseClient _supabase = Supabase.instance.client;

  String generatePublicId([int length = 8]) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    final random = Random();
    return List.generate(length, (index) => chars[random.nextInt(chars.length)]).join();
  }

  // ==========================================
  // PROFILES
  // ==========================================

  Future<ProfileModel?> getProfile(String userId) async {
    final response = await _supabase
        .from('profiles')
        .select()
        .eq('user_id', userId)
        .maybeSingle();

    if (response == null) return null;
    return ProfileModel.fromJson(response);
  }

  Future<void> updateProfile({
    required String userId,
    String? displayName,
    String? bio,
    String? avatarUrl,
  }) async {
    await _supabase.from('profiles').upsert({
      'user_id': userId,
      if (displayName != null) 'display_name': displayName.trim(),
      if (bio != null) 'bio': bio.trim(),
      if (avatarUrl != null) 'avatar_url': avatarUrl,
      'updated_at': DateTime.now().toIso8601String(),
    });
  }

  // ==========================================
  // CATEGORIES & ITEMS
  // ==========================================

  Future<List<CategoryModel>> getCategories(String userId) async {
    final response = await _supabase
        .from('categories')
        .select()
        .eq('user_id', userId)
        .order('display_order', ascending: true);

    return (response as List).map((json) => CategoryModel.fromJson(json)).toList();
  }

  Future<CategoryModel> createCategory(String userId, String name, [int displayOrder = 0]) async {
    final response = await _supabase
        .from('categories')
        .insert({
          'user_id': userId,
          'name': name.trim(),
          'display_order': displayOrder,
        })
        .select()
        .single();

    return CategoryModel.fromJson(response);
  }

  Future<void> updateCategory(String id, String name, [int? displayOrder]) async {
    await _supabase.from('categories').update({
      'name': name.trim(),
      if (displayOrder != null) 'display_order': displayOrder,
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', id);
  }

  Future<void> deleteCategory(String id) async {
    await _supabase.from('items').delete().eq('category_id', id);
    await _supabase.from('categories').delete().eq('id', id);
  }

  Future<List<ItemModel>> getItems(String userId) async {
    final response = await _supabase
        .from('items')
        .select('*, categories(name)')
        .eq('user_id', userId)
        .order('display_order', ascending: true);

    return (response as List).map((json) => ItemModel.fromJson(json)).toList();
  }

  Future<List<ItemModel>> getItemsByCategory(String categoryId) async {
    final response = await _supabase
        .from('items')
        .select('*, categories(name)')
        .eq('category_id', categoryId)
        .order('display_order', ascending: true);

    return (response as List).map((json) => ItemModel.fromJson(json)).toList();
  }

  Future<ItemModel> createItem({
    required String userId,
    required String categoryId,
    required String title,
    required ItemType type,
    required String content,
    int displayOrder = 0,
  }) async {
    final response = await _supabase
        .from('items')
        .insert({
          'user_id': userId,
          'category_id': categoryId,
          'title': title.trim(),
          'type': type.toDbString(),
          'content': content.trim(),
          'display_order': displayOrder,
        })
        .select('*, categories(name)')
        .single();

    return ItemModel.fromJson(response);
  }

  Future<void> updateItem({
    required String id,
    String? title,
    ItemType? type,
    String? content,
    int? displayOrder,
    String? categoryId,
  }) async {
    await _supabase.from('items').update({
      if (title != null) 'title': title.trim(),
      if (type != null) 'type': type.toDbString(),
      if (content != null) 'content': content.trim(),
      if (displayOrder != null) 'display_order': displayOrder,
      if (categoryId != null) 'category_id': categoryId,
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', id);
  }

  Future<void> deleteItem(String id) async {
    await _supabase.from('qr_page_items').delete().eq('item_id', id);
    await _supabase.from('items').delete().eq('id', id);
  }

  // ==========================================
  // QR PAGES (PROFILE QR CODES)
  // ==========================================

  Future<List<QRPageModel>> getQRPages(String userId, {bool includeDeleted = false}) async {
    var query = _supabase
        .from('qr_pages')
        .select('*, qr_page_items(id)')
        .eq('user_id', userId);

    if (!includeDeleted) {
      query = query.eq('is_deleted', false);
    } else {
      query = query.eq('is_deleted', true);
    }

    final response = await query.order('created_at', ascending: false);
    return (response as List).map((json) => QRPageModel.fromJson(json)).toList();
  }

  Future<QRPageModel?> getQRPageByPublicId(String publicId) async {
    final response = await _supabase
        .from('qr_pages')
        .select('*, qr_page_items(id, item_id, items(*, categories(name)))')
        .eq('public_id', publicId)
        .maybeSingle();

    if (response == null) return null;
    return QRPageModel.fromJson(response);
  }

  Future<QRPageModel> createQRPage({
    required String userId,
    String? title,
    List<String> itemIds = const [],
    QRStyleConfig styleConfig = const QRStyleConfig(),
    DateTime? expiresAt,
    bool showExpiresAt = true,
    bool locationLocked = false,
    double? locationLat,
    double? locationLng,
    String? locationName,
    String? starredItemId,
    String scanLimitType = 'unlimited',
    int? maxScans,
    int? dailyLimit,
    bool publicView = true,
    bool allowRequests = false,
    bool showInstallPopup = true,
    bool showFooterBranding = true,
    String? password,
  }) async {
    final publicId = generatePublicId();

    final response = await _supabase
        .from('qr_pages')
        .insert({
          'user_id': userId,
          'public_id': publicId,
          'title': title?.trim(),
          'style_config': styleConfig.toJson(),
          if (expiresAt != null) 'expires_at': expiresAt.toIso8601String(),
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
        })
        .select()
        .single();

    final qrPage = QRPageModel.fromJson(response);

    // Link items
    if (itemIds.isNotEmpty) {
      final pageItems = itemIds.asMap().entries.map((entry) => {
        'qr_page_id': qrPage.id,
        'item_id': entry.value,
        'display_order': entry.key,
      }).toList();
      await _supabase.from('qr_page_items').insert(pageItems);
    }

    // Set password if provided
    if (password != null && password.trim().isNotEmpty) {
      await setQRPassword('profile', qrPage.id, password.trim());
    }

    return qrPage;
  }

  Future<void> updateQRPage({
    required String id,
    String? title,
    List<String>? itemIds,
    QRStyleConfig? styleConfig,
    DateTime? expiresAt,
    bool? showExpiresAt,
    bool? locationLocked,
    double? locationLat,
    double? locationLng,
    String? locationName,
    String? starredItemId,
    String? scanLimitType,
    int? maxScans,
    int? dailyLimit,
    bool? publicView,
    bool? allowRequests,
    bool? showInstallPopup,
    bool? showFooterBranding,
    String? password,
    bool clearPassword = false,
  }) async {
    final updateData = <String, dynamic>{
      if (title != null) 'title': title.trim(),
      if (styleConfig != null) 'style_config': styleConfig.toJson(),
      if (expiresAt != null) 'expires_at': expiresAt.toIso8601String(),
      if (showExpiresAt != null) 'show_expires_at': showExpiresAt,
      if (locationLocked != null) 'location_locked': locationLocked,
      if (locationLat != null) 'location_lat': locationLat,
      if (locationLng != null) 'location_lng': locationLng,
      if (locationName != null) 'location_name': locationName,
      if (starredItemId != null) 'starred_item_id': starredItemId,
      if (scanLimitType != null) 'scan_limit_type': scanLimitType,
      if (maxScans != null) 'max_scans': maxScans,
      if (dailyLimit != null) 'daily_limit': dailyLimit,
      if (publicView != null) 'public_view': publicView,
      if (allowRequests != null) 'allow_requests': allowRequests,
      if (showInstallPopup != null) 'show_install_popup': showInstallPopup,
      if (showFooterBranding != null) 'show_footer_branding': showFooterBranding,
      'updated_at': DateTime.now().toIso8601String(),
    };

    await _supabase.from('qr_pages').update(updateData).eq('id', id);

    if (itemIds != null) {
      await _supabase.from('qr_page_items').delete().eq('qr_page_id', id);
      if (itemIds.isNotEmpty) {
        final pageItems = itemIds.asMap().entries.map((entry) => {
          'qr_page_id': id,
          'item_id': entry.value,
          'display_order': entry.key,
        }).toList();
        await _supabase.from('qr_page_items').insert(pageItems);
      }
    }

    if (clearPassword) {
      await setQRPassword('profile', id, null);
    } else if (password != null && password.trim().isNotEmpty) {
      await setQRPassword('profile', id, password.trim());
    }
  }

  Future<void> deleteQRPage(String id, {bool softDelete = true}) async {
    if (softDelete) {
      await _supabase.from('qr_pages').update({
        'is_deleted': true,
        'deleted_at': DateTime.now().toIso8601String(),
      }).eq('id', id);
    } else {
      await _supabase.from('qr_page_items').delete().eq('qr_page_id', id);
      await _supabase.from('qr_scans').delete().eq('qr_page_id', id);
      await _supabase.from('qr_permissions').delete().eq('qr_page_id', id);
      await _supabase.from('qr_access_requests').delete().eq('qr_page_id', id);
      await _supabase.from('qr_pages').delete().eq('id', id);
    }
  }

  Future<void> restoreQRPage(String id) async {
    await _supabase.from('qr_pages').update({
      'is_deleted': false,
      'deleted_at': null,
    }).eq('id', id);
  }

  Future<List<ItemModel>> getQRPageItems(String qrPageId) async {
    final response = await _supabase
        .from('qr_page_items')
        .select('item_id, display_order, items(*, categories(name))')
        .eq('qr_page_id', qrPageId)
        .order('display_order', ascending: true);

    return (response as List)
        .where((row) => row['items'] != null)
        .map((row) => ItemModel.fromJson(row['items']))
        .toList();
  }

  // ==========================================
  // BUSINESS PAGES & PRODUCTS
  // ==========================================

  Future<List<BusinessCategoryModel>> getBusinessCategories(String userId) async {
    final response = await _supabase
        .from('business_categories')
        .select()
        .eq('user_id', userId)
        .order('display_order', ascending: true);

    return (response as List).map((json) => BusinessCategoryModel.fromJson(json)).toList();
  }

  Future<BusinessCategoryModel> createBusinessCategory(String userId, String name) async {
    final response = await _supabase
        .from('business_categories')
        .insert({
          'user_id': userId,
          'name': name.trim(),
        })
        .select()
        .single();

    return BusinessCategoryModel.fromJson(response);
  }

  Future<void> updateBusinessCategory(String id, String name) async {
    await _supabase.from('business_categories').update({
      'name': name.trim(),
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', id);
  }

  Future<void> deleteBusinessCategory(String id) async {
    await _supabase.from('business_products').delete().eq('category_id', id);
    await _supabase.from('business_categories').delete().eq('id', id);
  }

  Future<List<BusinessProductModel>> getBusinessProducts(String userId, {String? categoryId}) async {
    var query = _supabase.from('business_products').select().eq('user_id', userId);
    if (categoryId != null && categoryId != 'all') {
      query = query.eq('category_id', categoryId);
    }
    final response = await query.order('display_order', ascending: true);
    return (response as List).map((json) => BusinessProductModel.fromJson(json)).toList();
  }

  Future<BusinessProductModel> createBusinessProduct({
    required String userId,
    required String categoryId,
    required String name,
    required String imageUrl,
    required double originalPrice,
    double? discountPrice,
    String? description,
    String status = 'active',
  }) async {
    final response = await _supabase
        .from('business_products')
        .insert({
          'user_id': userId,
          'category_id': categoryId,
          'name': name.trim(),
          'image_url': imageUrl,
          'original_price': originalPrice,
          'discount_price': discountPrice,
          'description': description?.trim(),
          'status': status,
        })
        .select()
        .single();

    return BusinessProductModel.fromJson(response);
  }

  Future<void> updateBusinessProduct({
    required String id,
    String? name,
    String? categoryId,
    String? imageUrl,
    double? originalPrice,
    double? discountPrice,
    String? description,
    String? status,
  }) async {
    await _supabase.from('business_products').update({
      if (name != null) 'name': name.trim(),
      if (categoryId != null) 'category_id': categoryId,
      if (imageUrl != null) 'image_url': imageUrl,
      if (originalPrice != null) 'original_price': originalPrice,
      if (discountPrice != null) 'discount_price': discountPrice,
      if (description != null) 'description': description.trim(),
      if (status != null) 'status': status,
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', id);
  }

  Future<void> deleteBusinessProduct(String id) async {
    await _supabase.from('qr_business_page_products').delete().eq('product_id', id);
    await _supabase.from('business_products').delete().eq('id', id);
  }

  Future<List<QRBusinessPageModel>> getQRBusinessPages(String userId, {bool includeDeleted = false}) async {
    var query = _supabase
        .from('qr_business_pages')
        .select('*, qr_business_page_products(id)')
        .eq('user_id', userId);

    if (!includeDeleted) {
      query = query.eq('is_deleted', false);
    } else {
      query = query.eq('is_deleted', true);
    }

    final response = await query.order('created_at', ascending: false);
    return (response as List).map((json) => QRBusinessPageModel.fromJson(json)).toList();
  }

  Future<QRBusinessPageModel?> getQRBusinessPageByPublicId(String publicId) async {
    final response = await _supabase
        .from('qr_business_pages')
        .select('*, qr_business_page_products(product_id, business_products(*))')
        .eq('public_id', publicId)
        .maybeSingle();

    if (response == null) return null;
    return QRBusinessPageModel.fromJson(response);
  }

  Future<QRBusinessPageModel?> getQRBusinessPageByStoreSlug(String storeSlug) async {
    final response = await _supabase
        .from('qr_business_pages')
        .select('*, qr_business_page_products(product_id, business_products(*))')
        .eq('store_slug', storeSlug)
        .maybeSingle();

    if (response == null) return null;
    return QRBusinessPageModel.fromJson(response);
  }

  Future<QRBusinessPageModel> createQRBusinessPage({
    required String userId,
    String? title,
    String? businessName,
    String? businessLogoUrl,
    String? businessAddress,
    String? businessPhone,
    String? businessEmail,
    String? businessWebsite,
    String? businessInstagram,
    String? businessFacebook,
    String? businessTwitter,
    String? businessWhatsapp,
    String? businessHours,
    String? storeSlug,
    List<String> productIds = const [],
    QRStyleConfig styleConfig = const QRStyleConfig(),
    DateTime? expiresAt,
    bool showExpiresAt = true,
    bool locationLocked = false,
    double? locationLat,
    double? locationLng,
    String? locationName,
    String scanLimitType = 'unlimited',
    int? maxScans,
    int? dailyLimit,
    bool publicView = true,
    bool allowRequests = false,
    bool showInstallPopup = true,
    bool showFooterBranding = true,
    String? password,
  }) async {
    final publicId = generatePublicId();

    final response = await _supabase
        .from('qr_business_pages')
        .insert({
          'user_id': userId,
          'public_id': publicId,
          'title': title?.trim(),
          'business_name': businessName?.trim(),
          'business_logo_url': businessLogoUrl,
          'business_address': businessAddress?.trim(),
          'business_phone': businessPhone?.trim(),
          'business_email': businessEmail?.trim(),
          'business_website': businessWebsite?.trim(),
          'business_instagram': businessInstagram?.trim(),
          'business_facebook': businessFacebook?.trim(),
          'business_twitter': businessTwitter?.trim(),
          'business_whatsapp': businessWhatsapp?.trim(),
          'business_hours': businessHours?.trim(),
          'store_slug': storeSlug?.trim(),
          'style_config': styleConfig.toJson(),
          if (expiresAt != null) 'expires_at': expiresAt.toIso8601String(),
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
        })
        .select()
        .single();

    final bizPage = QRBusinessPageModel.fromJson(response);

    if (productIds.isNotEmpty) {
      final pageProducts = productIds.asMap().entries.map((entry) => {
        'qr_page_id': bizPage.id,
        'product_id': entry.value,
        'display_order': entry.key,
      }).toList();
      await _supabase.from('qr_business_page_products').insert(pageProducts);
    }

    if (password != null && password.trim().isNotEmpty) {
      await setQRPassword('business', bizPage.id, password.trim());
    }

    return bizPage;
  }

  Future<void> updateQRBusinessPage({
    required String id,
    String? title,
    String? businessName,
    String? businessLogoUrl,
    String? businessAddress,
    String? businessPhone,
    String? businessEmail,
    String? businessWebsite,
    String? businessInstagram,
    String? businessFacebook,
    String? businessTwitter,
    String? businessWhatsapp,
    String? businessHours,
    String? storeSlug,
    List<String>? productIds,
    QRStyleConfig? styleConfig,
    DateTime? expiresAt,
    bool? showExpiresAt,
    bool? locationLocked,
    double? locationLat,
    double? locationLng,
    String? locationName,
    String? scanLimitType,
    int? maxScans,
    int? dailyLimit,
    bool? publicView,
    bool? allowRequests,
    bool? showInstallPopup,
    bool? showFooterBranding,
    String? password,
    bool clearPassword = false,
  }) async {
    final updateData = <String, dynamic>{
      if (title != null) 'title': title.trim(),
      if (businessName != null) 'business_name': businessName.trim(),
      if (businessLogoUrl != null) 'business_logo_url': businessLogoUrl,
      if (businessAddress != null) 'business_address': businessAddress.trim(),
      if (businessPhone != null) 'business_phone': businessPhone.trim(),
      if (businessEmail != null) 'business_email': businessEmail.trim(),
      if (businessWebsite != null) 'business_website': businessWebsite.trim(),
      if (businessInstagram != null) 'business_instagram': businessInstagram.trim(),
      if (businessFacebook != null) 'business_facebook': businessFacebook.trim(),
      if (businessTwitter != null) 'business_twitter': businessTwitter.trim(),
      if (businessWhatsapp != null) 'business_whatsapp': businessWhatsapp.trim(),
      if (businessHours != null) 'business_hours': businessHours.trim(),
      if (storeSlug != null) 'store_slug': storeSlug.trim(),
      if (styleConfig != null) 'style_config': styleConfig.toJson(),
      if (expiresAt != null) 'expires_at': expiresAt.toIso8601String(),
      if (showExpiresAt != null) 'show_expires_at': showExpiresAt,
      if (locationLocked != null) 'location_locked': locationLocked,
      if (locationLat != null) 'location_lat': locationLat,
      if (locationLng != null) 'location_lng': locationLng,
      if (locationName != null) 'location_name': locationName,
      if (scanLimitType != null) 'scan_limit_type': scanLimitType,
      if (maxScans != null) 'max_scans': maxScans,
      if (dailyLimit != null) 'daily_limit': dailyLimit,
      if (publicView != null) 'public_view': publicView,
      if (allowRequests != null) 'allow_requests': allowRequests,
      if (showInstallPopup != null) 'show_install_popup': showInstallPopup,
      if (showFooterBranding != null) 'show_footer_branding': showFooterBranding,
      'updated_at': DateTime.now().toIso8601String(),
    };

    await _supabase.from('qr_business_pages').update(updateData).eq('id', id);

    if (productIds != null) {
      await _supabase.from('qr_business_page_products').delete().eq('qr_page_id', id);
      if (productIds.isNotEmpty) {
        final pageProducts = productIds.asMap().entries.map((entry) => {
          'qr_page_id': id,
          'product_id': entry.value,
          'display_order': entry.key,
        }).toList();
        await _supabase.from('qr_business_page_products').insert(pageProducts);
      }
    }

    if (clearPassword) {
      await setQRPassword('business', id, null);
    } else if (password != null && password.trim().isNotEmpty) {
      await setQRPassword('business', id, password.trim());
    }
  }

  Future<void> deleteQRBusinessPage(String id, {bool softDelete = true}) async {
    if (softDelete) {
      await _supabase.from('qr_business_pages').update({
        'is_deleted': true,
        'deleted_at': DateTime.now().toIso8601String(),
      }).eq('id', id);
    } else {
      await _supabase.from('qr_business_page_products').delete().eq('qr_page_id', id);
      await _supabase.from('qr_scans').delete().eq('qr_business_page_id', id);
      await _supabase.from('qr_permissions').delete().eq('qr_business_page_id', id);
      await _supabase.from('qr_access_requests').delete().eq('qr_business_page_id', id);
      await _supabase.from('qr_business_pages').delete().eq('id', id);
    }
  }

  Future<void> restoreQRBusinessPage(String id) async {
    await _supabase.from('qr_business_pages').update({
      'is_deleted': false,
      'deleted_at': null,
    }).eq('id', id);
  }

  // ==========================================
  // UPI PAYMENTS
  // ==========================================

  Future<List<UPIPaymentModel>> getUPIPayments(String userId) async {
    final response = await _supabase
        .from('upi_payments')
        .select()
        .eq('user_id', userId)
        .order('created_at', ascending: false);

    return (response as List).map((json) => UPIPaymentModel.fromJson(json)).toList();
  }

  Future<UPIPaymentModel> createUPIPayment({
    required String userId,
    required String upiId,
    required String displayName,
    double? amount,
  }) async {
    final publicCode = generatePublicId(12);

    final response = await _supabase
        .from('upi_payments')
        .insert({
          'user_id': userId,
          'upi_id': upiId.trim(),
          'display_name': displayName.trim(),
          'public_code': publicCode,
          'amount': amount,
        })
        .select()
        .single();

    return UPIPaymentModel.fromJson(response);
  }

  Future<void> updateUPIPayment({
    required String id,
    String? upiId,
    String? displayName,
    double? amount,
    bool clearAmount = false,
  }) async {
    await _supabase.from('upi_payments').update({
      if (upiId != null) 'upi_id': upiId.trim(),
      if (displayName != null) 'display_name': displayName.trim(),
      if (clearAmount) 'amount': null else if (amount != null) 'amount': amount,
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('id', id);
  }

  Future<void> deleteUPIPayment(String id) async {
    await _supabase.from('upi_payments').delete().eq('id', id);
  }

  Future<Map<String, dynamic>?> resolveUPIByCode(String code) async {
    final response = await _supabase.rpc('resolve_upi_by_code', params: {
      'p_code': code,
    });

    if (response is List && response.isNotEmpty) {
      return response.first as Map<String, dynamic>;
    }
    return null;
  }

  // ==========================================
  // RPC & SECURITY (PASSWORD VERIFICATION)
  // ==========================================

  Future<void> setQRPassword(String pageType, String pageId, String? password) async {
    await _supabase.rpc('set_qr_password', params: {
      'p_page_type': pageType,
      'p_page_id': pageId,
      'p_password': password != null && password.trim().isNotEmpty ? password.trim() : null,
    });
  }

  Future<bool> verifyQRPassword(String publicId, String password) async {
    final response = await _supabase.rpc('verify_qr_password', params: {
      'qr_public_id': publicId,
      'password': password,
    });

    return response == true;
  }

  // ==========================================
  // SCAN HISTORY & LOGS
  // ==========================================

  Future<List<ScanHistoryModel>> getScanHistory(String userId) async {
    final response = await _supabase
        .from('scan_history')
        .select()
        .eq('user_id', userId)
        .order('scanned_at', ascending: false)
        .limit(50);

    return (response as List).map((json) => ScanHistoryModel.fromJson(json)).toList();
  }

  Future<void> addScanHistory({
    required String userId,
    required String scannedContent,
    required String contentType,
    String? title,
  }) async {
    await _supabase.from('scan_history').insert({
      'user_id': userId,
      'scanned_content': scannedContent,
      'content_type': contentType,
      'title': title,
    });
  }

  Future<void> deleteScanHistory(String id) async {
    await _supabase.from('scan_history').delete().eq('id', id);
  }

  Future<void> clearScanHistory(String userId) async {
    await _supabase.from('scan_history').delete().eq('user_id', userId);
  }

  Future<void> logQRScan({
    String? qrPageId,
    String? qrBusinessPageId,
    String? deviceType,
    String? city,
    String? country,
  }) async {
    try {
      await _supabase.from('qr_scans').insert({
        if (qrPageId != null) 'qr_page_id': qrPageId,
        if (qrBusinessPageId != null) 'qr_business_page_id': qrBusinessPageId,
        'device_type': deviceType ?? 'Mobile',
        'city': city,
        'country': country,
        'scanned_at': DateTime.now().toIso8601String(),
      });
    } catch (_) {}
  }

  // ==========================================
  // ACCESS REQUESTS & PERMISSIONS
  // ==========================================

  Future<List<QRAccessRequestModel>> getAccessRequests({
    String? qrPageId,
    String? qrBusinessPageId,
  }) async {
    var query = _supabase.from('qr_access_requests').select();
    if (qrPageId != null) {
      query = query.eq('qr_page_id', qrPageId);
    } else if (qrBusinessPageId != null) {
      query = query.eq('qr_business_page_id', qrBusinessPageId);
    }
    final response = await query.order('created_at', ascending: false);
    return (response as List).map((json) => QRAccessRequestModel.fromJson(json)).toList();
  }

  Future<void> submitAccessRequest({
    String? qrPageId,
    String? qrBusinessPageId,
    String? userId,
    required String userEmail,
    String requestedRole = 'viewer',
  }) async {
    await _supabase.from('qr_access_requests').insert({
      if (qrPageId != null) 'qr_page_id': qrPageId,
      if (qrBusinessPageId != null) 'qr_business_page_id': qrBusinessPageId,
      'user_id': userId,
      'user_email': userEmail.trim(),
      'requested_role': requestedRole,
      'status': 'pending',
    });
  }

  Future<void> updateAccessRequestStatus(String id, String status) async {
    await _supabase.from('qr_access_requests').update({
      'status': status,
    }).eq('id', id);
  }

  Future<List<QRPermissionModel>> getPermissions({
    String? qrPageId,
    String? qrBusinessPageId,
  }) async {
    var query = _supabase.from('qr_permissions').select();
    if (qrPageId != null) {
      query = query.eq('qr_page_id', qrPageId);
    } else if (qrBusinessPageId != null) {
      query = query.eq('qr_business_page_id', qrBusinessPageId);
    }
    final response = await query.order('created_at', ascending: false);
    return (response as List).map((json) => QRPermissionModel.fromJson(json)).toList();
  }

  Future<void> grantPermission({
    String? qrPageId,
    String? qrBusinessPageId,
    String? userId,
    required String userEmail,
    required String grantedBy,
    String role = 'viewer',
  }) async {
    await _supabase.from('qr_permissions').insert({
      if (qrPageId != null) 'qr_page_id': qrPageId,
      if (qrBusinessPageId != null) 'qr_business_page_id': qrBusinessPageId,
      'user_id': userId,
      'user_email': userEmail.trim(),
      'granted_by': grantedBy,
      'role': role,
      'status': 'active',
    });
  }

  Future<void> revokePermission(String id) async {
    await _supabase.from('qr_permissions').delete().eq('id', id);
  }
}
