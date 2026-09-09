import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config.dart';
import '../storage/token_storage.dart';
import 'api_error.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(ref.read(tokenStorageProvider));
});

class ApiClient {
  ApiClient(this._storage, {Dio? dio})
    : dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: AppConfig.apiBaseUrl,
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 20),
            ),
          ) {
    this.dio.interceptors.add(
      InterceptorsWrapper(onRequest: _authorize, onError: _retryUnauthorized),
    );
  }

  final TokenStorage _storage;
  final Dio dio;
  Future<TokenPair?>? _refreshing;
  void Function()? onSessionExpired;

  Future<void> _authorize(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = (await _storage.read())?.accessToken;
    if (token != null && options.headers['Authorization'] == null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  Future<void> _retryUnauthorized(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final request = error.requestOptions;
    if (error.response?.statusCode != 401 ||
        request.extra['retried'] == true ||
        request.path == '/auth/refresh') {
      handler.next(error);
      return;
    }
    try {
      final pair = await (_refreshing ??= _refresh());
      _refreshing = null;
      if (pair == null) {
        throw const ApiError('Kipindi chako kimekwisha. Ingia tena.');
      }
      request.headers['Authorization'] = 'Bearer ${pair.accessToken}';
      request.extra['retried'] = true;
      handler.resolve(await dio.fetch(request));
    } catch (_) {
      _refreshing = null;
      await _storage.clear();
      onSessionExpired?.call();
      handler.next(error);
    }
  }

  Future<TokenPair?> _refresh() async {
    final current = await _storage.read();
    final role = await _storage.readRole();
    if (current == null || role == null) return null;
    final cleanDio = Dio(BaseOptions(baseUrl: dio.options.baseUrl));
    final response = await cleanDio.post<Map<String, dynamic>>(
      '/auth/refresh',
      data: {'refreshToken': current.refreshToken},
    );
    final data = response.data!;
    final pair = TokenPair(
      data['accessToken'] as String,
      data['refreshToken'] as String,
    );
    await _storage.write(pair, role);
    return pair;
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    try {
      return (await dio.get<dynamic>(path, queryParameters: query)).data;
    } catch (error) {
      throw ApiError.from(error);
    }
  }

  Future<dynamic> post(String path, {Object? data, String? bearer}) async {
    try {
      return (await dio.post<dynamic>(
        path,
        data: data,
        options: bearer == null
            ? null
            : Options(headers: {'Authorization': 'Bearer $bearer'}),
      )).data;
    } catch (error) {
      throw ApiError.from(error);
    }
  }

  Future<dynamic> put(String path, {Object? data}) async {
    try {
      return (await dio.put<dynamic>(path, data: data)).data;
    } catch (error) {
      throw ApiError.from(error);
    }
  }

  Future<void> delete(String path) async {
    try {
      await dio.delete<void>(path);
    } catch (error) {
      throw ApiError.from(error);
    }
  }
}
