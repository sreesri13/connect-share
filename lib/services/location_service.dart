import 'package:geolocator/geolocator.dart';

class LocationService {
  /// Check and request location permissions
  Future<bool> handlePermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  /// Get current GPS position
  Future<Position?> getCurrentPosition() async {
    final hasPermission = await handlePermission();
    if (!hasPermission) return null;

    try {
      return await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );
    } catch (_) {
      return null;
    }
  }

  /// Calculate distance in meters using Haversine formula
  double calculateDistanceMeters({
    required double startLat,
    required double startLng,
    required double endLat,
    required double endLng,
  }) {
    return Geolocator.distanceBetween(startLat, startLng, endLat, endLng);
  }

  /// Verify if user is within the allowed radius (default 500 meters)
  Future<bool> verifyLocationProximity({
    required double targetLat,
    required double targetLng,
    double radiusMeters = 500.0,
  }) async {
    final position = await getCurrentPosition();
    if (position == null) return false;

    final distance = calculateDistanceMeters(
      startLat: position.latitude,
      startLng: position.longitude,
      endLat: targetLat,
      endLng: targetLng,
    );

    return distance <= radiusMeters;
  }
}
