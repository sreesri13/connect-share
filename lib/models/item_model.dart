enum ItemType {
  url,
  text,
  pdf,
  image,
  video,
  audio,
  wifi,
  largefile,
  others;

  static ItemType fromString(String? type) {
    switch (type?.toLowerCase()) {
      case 'url':
        return ItemType.url;
      case 'text':
        return ItemType.text;
      case 'pdf':
        return ItemType.pdf;
      case 'image':
        return ItemType.image;
      case 'video':
        return ItemType.video;
      case 'audio':
        return ItemType.audio;
      case 'wifi':
        return ItemType.wifi;
      case 'largefile':
        return ItemType.largefile;
      default:
        return ItemType.others;
    }
  }

  String toDbString() {
    return name;
  }
}

class ItemModel {
  final String id;
  final String categoryId;
  final String userId;
  final String title;
  final ItemType type;
  final String content;
  final int displayOrder;
  final DateTime? createdAt;
  final DateTime? updatedAt;
  final String? categoryName; // Helper for joins

  ItemModel({
    required this.id,
    required this.categoryId,
    required this.userId,
    required this.title,
    required this.type,
    required this.content,
    this.displayOrder = 0,
    this.createdAt,
    this.updatedAt,
    this.categoryName,
  });

  factory ItemModel.fromJson(Map<String, dynamic> json) {
    return ItemModel(
      id: json['id'] as String? ?? '',
      categoryId: json['category_id'] as String? ?? '',
      userId: json['user_id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      type: ItemType.fromString(json['type'] as String?),
      content: json['content'] as String? ?? '',
      displayOrder: json['display_order'] as int? ?? 0,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'] as String)
          : null,
      categoryName: json['categories'] != null
          ? (json['categories']['name'] as String?)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'category_id': categoryId,
      'user_id': userId,
      'title': title,
      'type': type.toDbString(),
      'content': content,
      'display_order': displayOrder,
    };
  }

  ItemModel copyWith({
    String? id,
    String? categoryId,
    String? userId,
    String? title,
    ItemType? type,
    String? content,
    int? displayOrder,
    DateTime? createdAt,
    DateTime? updatedAt,
    String? categoryName,
  }) {
    return ItemModel(
      id: id ?? this.id,
      categoryId: categoryId ?? this.categoryId,
      userId: userId ?? this.userId,
      title: title ?? this.title,
      type: type ?? this.type,
      content: content ?? this.content,
      displayOrder: displayOrder ?? this.displayOrder,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      categoryName: categoryName ?? this.categoryName,
    );
  }
}
