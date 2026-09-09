import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';
import '../../core/storage/token_storage.dart';
import '../notifications/notification_repository.dart';
import 'phone.dart';

enum UserRole { buyer, seller }

enum AuthStage { signedOut, otp, onboarding, authenticated }

class AuthSession {
  const AuthSession({
    this.stage = AuthStage.signedOut,
    this.role,
    this.phone,
    this.registrationToken,
    this.pendingBuyer = false,
    this.isBusy = false,
    this.errorMessage,
  });
  final AuthStage stage;
  final UserRole? role;
  final String? phone;
  final String? registrationToken;
  final bool pendingBuyer;
  final bool isBusy;
  final String? errorMessage;

  AuthSession copyWith({
    AuthStage? stage,
    bool? pendingBuyer,
    bool? isBusy,
    String? errorMessage,
    bool clearError = false,
  }) => AuthSession(
    stage: stage ?? this.stage,
    role: role,
    phone: phone,
    registrationToken: registrationToken,
    pendingBuyer: pendingBuyer ?? this.pendingBuyer,
    isBusy: isBusy ?? this.isBusy,
    errorMessage: clearError ? null : errorMessage ?? this.errorMessage,
  );
}

final authControllerProvider =
    AsyncNotifierProvider<AuthController, AuthSession>(AuthController.new);

class AuthController extends AsyncNotifier<AuthSession> {
  ApiClient get _api => ref.read(apiClientProvider);
  TokenStorage get _storage => ref.read(tokenStorageProvider);

  @override
  Future<AuthSession> build() async {
    _api.onSessionExpired = () {
      state = const AsyncData(AuthSession());
    };
    final tokens = await _storage.read();
    final roleValue = await _storage.readRole();
    if (tokens == null || roleValue == null) return const AuthSession();
    final role = UserRole.values
        .where((item) => item.name == roleValue)
        .firstOrNull;
    if (role == null) {
      await _storage.clear();
      return const AuthSession();
    }
    var pending = false;
    if (role == UserRole.buyer) {
      try {
        final status = await _api.get('/buyers/status');
        pending = status is Map && status['verificationStatus'] != 'approved';
      } catch (_) {
        // Keep the session usable during transient status failures.
      }
    }
    Future.microtask(
      () => ref.read(notificationRepositoryProvider).registerCurrentDevice(),
    );
    return AuthSession(
      stage: AuthStage.authenticated,
      role: role,
      pendingBuyer: pending,
    );
  }

  Future<void> requestOtp(String rawPhone, UserRole role) async {
    final current = state.value ?? const AuthSession();
    await _transition(current, () async {
      final phone = normalizeTanzanianPhone(rawPhone);
      await _api.post(
        '/auth/request-otp',
        data: {'phone': phone, 'role': role.name},
      );
      return AuthSession(stage: AuthStage.otp, role: role, phone: phone);
    });
  }

  Future<void> verifyOtp(String otp) async {
    final current = state.requireValue;
    await _transition(current, () async {
      final data =
          await _api.post(
                '/auth/verify-otp',
                data: {
                  'phone': current.phone,
                  'role': current.role!.name,
                  'otp': otp,
                },
              )
              as Map;
      final user = data['user'] as Map?;
      final pair = TokenPair(
        data['accessToken'] as String,
        data['refreshToken'] as String,
      );
      if (user?['role'] == 'registration') {
        return AuthSession(
          stage: AuthStage.onboarding,
          role: current.role,
          phone: current.phone,
          registrationToken: pair.accessToken,
        );
      }
      await _storage.write(pair, current.role!.name);
      var pending = false;
      if (current.role == UserRole.buyer) {
        final status = await _api.get('/buyers/status');
        pending = status is Map && status['verificationStatus'] != 'approved';
      }
      Future.microtask(
        () => ref.read(notificationRepositoryProvider).registerCurrentDevice(),
      );
      return AuthSession(
        stage: AuthStage.authenticated,
        role: current.role,
        pendingBuyer: pending,
      );
    });
  }

  Future<void> register(Map<String, dynamic> details) async {
    final current = state.requireValue;
    await _transition(current, () async {
      await _api.post(
        current.role == UserRole.seller
            ? '/sellers/register'
            : '/buyers/register',
        data: {'phone': current.phone, ...details},
        bearer: current.registrationToken,
      );
      await _storage.clear();
      return const AuthSession();
    });
  }

  Future<void> _transition(
    AuthSession current,
    Future<AuthSession> Function() action,
  ) async {
    state = AsyncData(current.copyWith(isBusy: true, clearError: true));
    try {
      state = AsyncData(await action());
    } catch (error) {
      state = AsyncData(current.copyWith(errorMessage: '$error'));
    }
  }

  Future<void> logout() async {
    final token = await _storage.read();
    await ref.read(notificationRepositoryProvider).unregisterCurrentDevice();
    if (token != null) {
      try {
        await _api.post(
          '/auth/logout',
          data: {'refreshToken': token.refreshToken},
        );
      } catch (_) {}
    }
    await _storage.clear();
    state = const AsyncData(AuthSession());
  }
}
