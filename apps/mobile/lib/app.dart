import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/theme/app_theme.dart';
import 'features/auth/auth_controller.dart';
import 'features/auth/auth_screens.dart';
import 'features/home/home_shell.dart';

class MkulimaApp extends ConsumerWidget {
  const MkulimaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Mkulima Link',
      theme: AppTheme.light,
      locale: const Locale('sw'),
      supportedLocales: const [Locale('sw')],
      home: auth.value == null
          ? auth.when(
              loading: () => const _LaunchScreen(),
              error: (error, _) => AuthLanding(initialError: error.toString()),
              data: (_) => const AuthLanding(),
            )
          : switch (auth.value!.stage) {
              AuthStage.authenticated => HomeShell(session: auth.value!),
              AuthStage.onboarding => OnboardingScreen(session: auth.value!),
              _ => const AuthLanding(),
            },
    );
  }
}

class _LaunchScreen extends StatelessWidget {
  const _LaunchScreen();

  @override
  Widget build(BuildContext context) => const Scaffold(
    body: Center(child: CircularProgressIndicator(key: Key('launch-loader'))),
  );
}
