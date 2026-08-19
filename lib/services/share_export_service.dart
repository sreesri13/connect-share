import 'dart:io';
import 'dart:typed_data';
import 'package:path_provider/path_provider.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:screenshot/screenshot.dart';
import 'package:share_plus/share_plus.dart';

class ShareExportService {
  final ScreenshotController screenshotController = ScreenshotController();

  /// Share text or link via system share sheet
  Future<void> shareText({required String text, String? subject}) async {
    await Share.share(text, subject: subject);
  }

  /// Share image bytes via system share sheet
  Future<void> shareImage({
    required Uint8List imageBytes,
    required String fileName,
    String? text,
  }) async {
    final tempDir = await getTemporaryDirectory();
    final file = File('${tempDir.path}/$fileName.png');
    await file.writeAsBytes(imageBytes);

    await Share.shareXFiles(
      [XFile(file.path)],
      text: text,
    );
  }

  /// Export and print PDF Flyer with QR Code
  Future<void> exportAndPrintQRFlyer({
    required String title,
    required String subtitle,
    required Uint8List qrImageBytes,
    String? footerNote,
  }) async {
    final doc = pw.Document();
    final qrImage = pw.MemoryImage(qrImageBytes);

    doc.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        margin: const pw.EdgeInsets.all(32),
        build: (pw.Context context) {
          return pw.Center(
            child: pw.Column(
              mainAxisAlignment: pw.MainAxisAlignment.center,
              crossAxisAlignment: pw.CrossAxisAlignment.center,
              children: [
                pw.Text(
                  'ConnectHUB',
                  style: pw.TextStyle(
                    fontSize: 28,
                    fontWeight: pw.FontWeight.bold,
                    color: PdfColors.purple800,
                  ),
                ),
                pw.SizedBox(height: 12),
                pw.Text(
                  title,
                  style: pw.TextStyle(
                    fontSize: 22,
                    fontWeight: pw.FontWeight.bold,
                  ),
                ),
                if (subtitle.isNotEmpty) ...[
                  pw.SizedBox(height: 6),
                  pw.Text(
                    subtitle,
                    style: const pw.TextStyle(
                      fontSize: 14,
                      color: PdfColors.grey700,
                    ),
                  ),
                ],
                pw.SizedBox(height: 28),
                pw.Container(
                  padding: const pw.EdgeInsets.all(16),
                  decoration: pw.BoxDecoration(
                    border: pw.Border.all(color: PdfColors.grey400, width: 2),
                    borderRadius: pw.BorderRadius.circular(16),
                  ),
                  child: pw.Image(qrImage, width: 240, height: 240),
                ),
                pw.SizedBox(height: 28),
                pw.Text(
                  'Scan with any camera or UPI app to view',
                  style: pw.TextStyle(
                    fontSize: 13,
                    fontWeight: pw.FontWeight.bold,
                    color: PdfColors.purple700,
                  ),
                ),
                if (footerNote != null && footerNote.isNotEmpty) ...[
                  pw.SizedBox(height: 8),
                  pw.Text(
                    footerNote,
                    style: const pw.TextStyle(
                      fontSize: 11,
                      color: PdfColors.grey600,
                    ),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => doc.save(),
    );
  }
}
