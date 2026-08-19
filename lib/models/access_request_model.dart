class QRAccessRequestModel {
  final String id;
  final String? qrPageId;
  final String? qrBusinessPageId;
  final String? userId;
  final String userEmail;
  final String requestedRole; // viewer, editor
  final String status; // pending, approved, rejected
  final DateTime? createdAt;

  QRAccessRequestModel({
    required this.id,
    this.qrPageId,
    this.qrBusinessPageId,
    this.userId,
    required this.userEmail,
    this.requestedRole = 'viewer',
    this.status = 'pending',
    this.createdAt,
  });

  factory QRAccessRequestModel.fromJson(Map<String, dynamic> json) {
    return QRAccessRequestModel(
      id: json['id'] as String? ?? '',
      qrPageId: json['qr_page_id'] as String?,
      qrBusinessPageId: json['qr_business_page_id'] as String?,
      userId: json['user_id'] as String?,
      userEmail: json['user_email'] as String? ?? '',
      requestedRole: json['requested_role'] as String? ?? 'viewer',
      status: json['status'] as String? ?? 'pending',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'qr_page_id': qrPageId,
      'qr_business_page_id': qrBusinessPageId,
      'user_id': userId,
      'user_email': userEmail,
      'requested_role': requestedRole,
      'status': status,
    };
  }
}

class QRPermissionModel {
  final String id;
  final String? qrPageId;
  final String? qrBusinessPageId;
  final String? userId;
  final String userEmail;
  final String role; // viewer, editor
  final String status; // active, revoked
  final String grantedBy;
  final DateTime? createdAt;

  QRPermissionModel({
    required this.id,
    this.qrPageId,
    this.qrBusinessPageId,
    this.userId,
    required this.userEmail,
    this.role = 'viewer',
    this.status = 'active',
    required this.grantedBy,
    this.createdAt,
  });

  factory QRPermissionModel.fromJson(Map<String, dynamic> json) {
    return QRPermissionModel(
      id: json['id'] as String? ?? '',
      qrPageId: json['qr_page_id'] as String?,
      qrBusinessPageId: json['qr_business_page_id'] as String?,
      userId: json['user_id'] as String?,
      userEmail: json['user_email'] as String? ?? '',
      role: json['role'] as String? ?? 'viewer',
      status: json['status'] as String? ?? 'active',
      grantedBy: json['granted_by'] as String? ?? '',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
    );
  }
}
