import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../models/qr_page_model.dart';
import '../services/qr_style_service.dart';

class CustomQRView extends StatelessWidget {
  final String data;
  final QRStyleConfig styleConfig;
  final double size;
  final EdgeInsets padding;
  final BorderRadius? borderRadius;

  const CustomQRView({
    super.key,
    required this.data,
    this.styleConfig = const QRStyleConfig(),
    this.size = 220,
    this.padding = const EdgeInsets.all(16),
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = QRStyleService.hexToColor(styleConfig.backgroundColor);
    final bodyColor = QRStyleService.hexToColor(styleConfig.bodyColor);
    final eyeFrameColor = QRStyleService.hexToColor(styleConfig.eyeFrameColor);

    QrEyeShape eyeShape;
    switch (styleConfig.eyeFrameShape) {
      case 'circle':
      case 'rounded':
        eyeShape = QrEyeShape.circle;
        break;
      default:
        eyeShape = QrEyeShape.square;
    }

    QrDataModuleShape dataShape;
    switch (styleConfig.bodyShape) {
      case 'dots':
      case 'rounded':
        dataShape = QrDataModuleShape.circle;
        break;
      default:
        dataShape = QrDataModuleShape.square;
    }

    QrEmbeddedImageStyle? embeddedImageStyle;
    ImageProvider? embeddedImage;

    if (styleConfig.logoUrl != null && styleConfig.logoUrl!.isNotEmpty) {
      double logoDimension = size * 0.22;
      if (styleConfig.logoSize == 'small') logoDimension = size * 0.16;
      if (styleConfig.logoSize == 'large') logoDimension = size * 0.28;

      embeddedImageStyle = QrEmbeddedImageStyle(
        size: Size(logoDimension, logoDimension),
      );
      embeddedImage = CachedNetworkImageProvider(styleConfig.logoUrl!);
    }

    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: borderRadius ?? BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.25),
            blurRadius: 16,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: QrImageView(
        data: data.isEmpty ? 'https://connecthub.app' : data,
        version: QrVersions.auto,
        size: size,
        backgroundColor: Colors.transparent,
        eyeStyle: QrEyeStyle(
          eyeShape: eyeShape,
          color: eyeFrameColor,
        ),
        dataModuleStyle: QrDataModuleStyle(
          dataModuleShape: dataShape,
          color: bodyColor,
        ),
        embeddedImage: embeddedImage,
        embeddedImageStyle: embeddedImageStyle,
        errorCorrectionLevel: _mapErrorCorrection(styleConfig.errorCorrectionLevel),
      ),
    );
  }

  int _mapErrorCorrection(String level) {
    switch (level.toUpperCase()) {
      case 'L':
        return QrErrorCorrectLevel.L;
      case 'M':
        return QrErrorCorrectLevel.M;
      case 'Q':
        return QrErrorCorrectLevel.Q;
      case 'H':
      default:
        return QrErrorCorrectLevel.H;
    }
  }
}
