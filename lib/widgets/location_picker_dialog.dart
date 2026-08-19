import 'package:flutter/material.dart';
import '../config/theme.dart';
import '../services/location_service.dart';

class LocationDataResult {
  final double lat;
  final double lng;
  final String name;

  LocationDataResult({
    required this.lat,
    required this.lng,
    required this.name,
  });
}

class LocationPickerDialog extends StatefulWidget {
  final double? initialLat;
  final double? initialLng;
  final String? initialName;

  const LocationPickerDialog({
    super.key,
    this.initialLat,
    this.initialLng,
    this.initialName,
  });

  static Future<LocationDataResult?> show(
    BuildContext context, {
    double? initialLat,
    double? initialLng,
    String? initialName,
  }) {
    return showDialog<LocationDataResult>(
      context: context,
      builder: (ctx) => LocationPickerDialog(
        initialLat: initialLat,
        initialLng: initialLng,
        initialName: initialName,
      ),
    );
  }

  @override
  State<LocationPickerDialog> createState() => _LocationPickerDialogState();
}

class _LocationPickerDialogState extends State<LocationPickerDialog> {
  final _nameController = TextEditingController();
  final _latController = TextEditingController();
  final _lngController = TextEditingController();
  final _locationService = LocationService();
  bool _isFetchingGPS = false;

  @override
  void initState() {
    super.initState();
    _nameController.text = widget.initialName ?? '';
    _latController.text = widget.initialLat?.toString() ?? '';
    _lngController.text = widget.initialLng?.toString() ?? '';
  }

  Future<void> _fetchCurrentGPS() async {
    setState(() => _isFetchingGPS = true);
    final pos = await _locationService.getCurrentPosition();
    setState(() => _isFetchingGPS = false);

    if (pos != null) {
      _latController.text = pos.latitude.toStringAsFixed(6);
      _lngController.text = pos.longitude.toStringAsFixed(6);
      if (_nameController.text.isEmpty) {
        _nameController.text = 'Current Location';
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to get GPS location. Enable location permissions.')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Row(
        children: [
          Icon(Icons.location_on, color: AppColors.primaryLight),
          SizedBox(width: 8),
          Text('Location Lock Settings'),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Lock this QR code so only visitors physically near the specified GPS coordinate can unlock and view it.',
              style: TextStyle(fontSize: 13, color: AppColors.textMuted),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              icon: _isFetchingGPS
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.my_location, size: 18),
              label: Text(_isFetchingGPS ? 'Acquiring GPS...' : 'Use My Current Location'),
              onPressed: _isFetchingGPS ? null : _fetchCurrentGPS,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Location Name (e.g. Office, Store, Event Hall)',
                prefixIcon: Icon(Icons.store),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _latController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
              decoration: const InputDecoration(
                labelText: 'Latitude',
                prefixIcon: Icon(Icons.navigation),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _lngController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true, signed: true),
              decoration: const InputDecoration(
                labelText: 'Longitude',
                prefixIcon: Icon(Icons.explore),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () {
            final lat = double.tryParse(_latController.text.trim());
            final lng = double.tryParse(_lngController.text.trim());
            if (lat == null || lng == null) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Please enter valid GPS coordinates')),
              );
              return;
            }
            Navigator.of(context).pop(LocationDataResult(
              lat: lat,
              lng: lng,
              name: _nameController.text.trim().isEmpty ? 'Specified Location' : _nameController.text.trim(),
            ));
          },
          child: const Text('Save Location'),
        ),
      ],
    );
  }
}
