import 'dart:io';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

final pushNotificationsProvider = Provider<PushNotifications>(
  (ref) => PushNotifications(),
);

@pragma('vm:entry-point')
Future<void> handleBackgroundMessage(RemoteMessage message) async {
  try {
    await Firebase.initializeApp();
  } catch (_) {}
}

class PushNotifications {
  final local = FlutterLocalNotificationsPlugin();
  FirebaseMessaging? messaging;
  bool get available => messaging != null;

  Future<void> initialize() async {
    try {
      await Firebase.initializeApp();
      FirebaseMessaging.onBackgroundMessage(handleBackgroundMessage);
      messaging = FirebaseMessaging.instance;
      await local.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('@mipmap/ic_launcher'),
          iOS: DarwinInitializationSettings(),
        ),
      );
      if (Platform.isAndroid) {
        await local
            .resolvePlatformSpecificImplementation<
              AndroidFlutterLocalNotificationsPlugin
            >()
            ?.createNotificationChannel(
              const AndroidNotificationChannel(
                'market_updates',
                'Taarifa za soko',
                description: 'Mahitaji, oda na taarifa za malipo',
                importance: Importance.high,
              ),
            );
      }
      FirebaseMessaging.onMessage.listen((message) {
        final notification = message.notification;
        if (notification == null) return;
        local.show(
          id: notification.hashCode,
          title: notification.title ?? 'Mkulima Link',
          body: notification.body,
          notificationDetails: const NotificationDetails(
            android: AndroidNotificationDetails(
              'market_updates',
              'Taarifa za soko',
              importance: Importance.high,
              priority: Priority.high,
            ),
            iOS: DarwinNotificationDetails(),
          ),
        );
      });
    } catch (_) {
      messaging = null;
      // The marketplace remains fully usable without Firebase client config.
    }
  }

  Future<String?> requestToken() async {
    try {
      await messaging?.requestPermission(alert: true, badge: true, sound: true);
      return messaging?.getToken();
    } catch (_) {
      return null;
    }
  }
}
