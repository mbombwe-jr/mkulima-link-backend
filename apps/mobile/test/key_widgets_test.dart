import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mkulima_app/core/theme/app_theme.dart';
import 'package:mkulima_app/features/auth/auth_controller.dart';
import 'package:mkulima_app/features/auth/auth_screens.dart';

class _SignedOutAuth extends AuthController {
  @override
  Future<AuthSession> build() async => const AuthSession();
}

void main() {
  testWidgets('login exposes both roles and phone action', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authControllerProvider.overrideWith(_SignedOutAuth.new)],
        child: MaterialApp(theme: AppTheme.light, home: const AuthLanding()),
      ),
    );
    await tester.pump();

    expect(find.text('Mkulima'), findsOneWidget);
    expect(find.text('Mnunuzi'), findsOneWidget);
    expect(find.byKey(const Key('phone-field')), findsOneWidget);
    expect(find.byKey(const Key('request-otp')), findsOneWidget);
  });
}
