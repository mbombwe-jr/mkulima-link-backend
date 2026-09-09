import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app.dart';
import 'core/notifications/push_notifications.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final container = ProviderContainer();
  await container.read(pushNotificationsProvider).initialize();
  runApp(
    UncontrolledProviderScope(container: container, child: const MkulimaApp()),
  );
}
