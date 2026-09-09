import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

class TokenPair {
  const TokenPair(this.accessToken, this.refreshToken);
  final String accessToken;
  final String refreshToken;
}

class TokenStorage {
  TokenStorage([FlutterSecureStorage? storage])
    : _storage =
          storage ?? const FlutterSecureStorage(aOptions: AndroidOptions());

  final FlutterSecureStorage _storage;
  static const _access = 'access_token';
  static const _refresh = 'refresh_token';
  static const _role = 'user_role';

  Future<TokenPair?> read() async {
    final values = await Future.wait([
      _storage.read(key: _access),
      _storage.read(key: _refresh),
    ]);
    if (values[0] == null || values[1] == null) return null;
    return TokenPair(values[0]!, values[1]!);
  }

  Future<String?> readRole() => _storage.read(key: _role);

  Future<void> write(TokenPair pair, String role) => Future.wait([
    _storage.write(key: _access, value: pair.accessToken),
    _storage.write(key: _refresh, value: pair.refreshToken),
    _storage.write(key: _role, value: role),
  ]);

  Future<void> clear() => Future.wait([
    _storage.delete(key: _access),
    _storage.delete(key: _refresh),
    _storage.delete(key: _role),
  ]);
}
