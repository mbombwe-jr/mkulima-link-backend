import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/notifications/push_notifications.dart';

final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository(
    ref.read(apiClientProvider),
    ref.read(pushNotificationsProvider),
  );
});

class NotificationRepository {
  NotificationRepository(this.api, this.push);
  final ApiClient api;
  final PushNotifications push;
  String? _token;

  Future<void> registerCurrentDevice() async {
    _token = await push.requestToken();
    final token = _token;
    if (token == null) return;
    try {
      await api.post(
        '/notifications/devices',
        data: {'token': token, 'platform': Platform.isIOS ? 'ios' : 'android'},
      );
      push.messaging?.onTokenRefresh.listen((newToken) async {
        _token = newToken;
        try {
          await api.post(
            '/notifications/devices',
            data: {
              'token': newToken,
              'platform': Platform.isIOS ? 'ios' : 'android',
            },
          );
        } catch (_) {}
      });
    } catch (_) {}
  }

  Future<void> unregisterCurrentDevice() async {
    if (_token == null) return;
    try {
      await api.delete(
        '/notifications/devices/${Uri.encodeComponent(_token!)}',
      );
    } catch (_) {}
  }
}
