import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../config/theme.dart';
import '../models/item_model.dart';
import 'platform_icon.dart';

class FileViewerDialog extends StatelessWidget {
  final ItemModel item;

  const FileViewerDialog({super.key, required this.item});

  static Future<void> show(BuildContext context, ItemModel item) {
    return showDialog(
      context: context,
      builder: (ctx) => FileViewerDialog(item: item),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: Container(
        padding: const EdgeInsets.all(20),
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: PlatformIcon(type: item.type, content: item.content),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        item.type.name.toUpperCase(),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: AppColors.textMuted),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const Divider(color: AppColors.cardBorder, height: 24),

            // Content preview
            Flexible(
              child: SingleChildScrollView(
                child: _buildPreviewContent(context),
              ),
            ),
            const SizedBox(height: 16),

            // Action Buttons
            _buildActionButtons(context),
          ],
        ),
      ),
    );
  }

  Widget _buildPreviewContent(BuildContext context) {
    switch (item.type) {
      case ItemType.image:
        return ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: CachedNetworkImage(
            imageUrl: item.content,
            placeholder: (context, url) => const Center(
              child: Padding(
                padding: EdgeInsets.all(40),
                child: CircularProgressIndicator(),
              ),
            ),
            errorWidget: (context, url, error) => Container(
              padding: const EdgeInsets.all(32),
              color: AppColors.card,
              child: const Center(
                child: Icon(Icons.broken_image, size: 48, color: AppColors.textMuted),
              ),
            ),
            fit: BoxFit.contain,
          ),
        );

      case ItemType.wifi:
        final ssid = RegExp(r'S:([^;]*)').firstMatch(item.content)?.group(1) ?? 'WiFi Network';
        final pass = RegExp(r'P:([^;]*)').firstMatch(item.content)?.group(1) ?? '';
        final type = RegExp(r'T:([^;]*)').firstMatch(item.content)?.group(1) ?? 'WPA';

        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.wifi, color: AppColors.cyan, size: 24),
                  SizedBox(width: 8),
                  Text('WiFi Credentials', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              ),
              const SizedBox(height: 12),
              Text('Network SSID: $ssid', style: const TextStyle(fontSize: 14)),
              const SizedBox(height: 6),
              Text('Security: $type', style: const TextStyle(fontSize: 13, color: AppColors.textMuted)),
              if (pass.isNotEmpty) ...[
                const SizedBox(height: 6),
                Text('Password: $pass', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600)),
              ],
            ],
          ),
        );

      case ItemType.text:
        return Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: SelectableText(
            item.content,
            style: const TextStyle(fontSize: 14, color: AppColors.textPrimary, height: 1.5),
          ),
        );

      default:
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: Column(
            children: [
              PlatformIcon(type: item.type, content: item.content, size: 48),
              const SizedBox(height: 12),
              Text(
                item.title,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Text(
                item.content,
                textAlign: TextAlign.center,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ],
          ),
        );
    }
  }

  Widget _buildActionButtons(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            icon: const Icon(Icons.copy, size: 18),
            label: const Text('Copy'),
            onPressed: () {
              Clipboard.setData(ClipboardData(text: item.content));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Copied to clipboard!')),
              );
            },
          ),
        ),
        if (item.type != ItemType.text && item.type != ItemType.wifi) ...[
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              icon: const Icon(Icons.open_in_new, size: 18),
              label: const Text('Open'),
              onPressed: () async {
                final uri = Uri.tryParse(
                  item.content.startsWith('http') ? item.content : 'https://${item.content}',
                );
                if (uri != null) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
            ),
          ),
        ],
      ],
    );
  }
}
