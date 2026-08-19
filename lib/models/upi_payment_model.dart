class UPIPaymentModel {
  final String id;
  final String userId;
  final String upiId;
  final String displayName;
  final String publicCode;
  final double? amount;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final int scanCount;

  UPIPaymentModel({
    required this.id,
    required this.userId,
    required this.upiId,
    required this.displayName,
    required this.publicCode,
    this.amount,
    this.createdAt,
    this.updatedAt,
    this.scanCount = 0,
  });

  factory UPIPaymentModel.fromJson(Map<String, dynamic> json) {
    return UPIPaymentModel(
      id: json['id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      upiId: json['upi_id'] as String? ?? '',
      displayName: json['display_name'] as String? ?? 'QR Payments',
      publicCode: json['public_code'] as String? ?? '',
      amount: (json['amount'] as num?)?.toDouble(),
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
      scanCount: json['scan_count'] as int? ?? 0,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'upi_id': upiId,
      'display_name': displayName,
      'public_code': publicCode,
      'amount': amount,
    };
  }

  String get upiDeepLink {
    final params = <String, String>{
      'pa': upiId.trim(),
      'pn': displayName.trim(),
      'cu': 'INR',
      'tn': 'QR Payment',
      'tr': 'QR-$publicCode-${DateTime.now().millisecondsSinceEpoch}',
    };
    if (amount != null && amount! > 0) {
      params['am'] = amount!.toStringAsFixed(2);
    }
    final queryString = params.entries
        .map((e) => '${e.key}=${Uri.encodeComponent(e.value)}')
        .join('&');
    return 'upi://pay?$queryString';
  }
}
