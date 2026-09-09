import 'package:dio/dio.dart';

class ApiError implements Exception {
  const ApiError(this.message, {this.code, this.statusCode});
  final String message;
  final String? code;
  final int? statusCode;

  factory ApiError.from(Object error) {
    if (error is ApiError) return error;
    if (error is DioException) {
      final body = error.response?.data;
      if (body is Map) {
        final envelope = body['error'];
        if (envelope is Map) {
          return ApiError(
            envelope['message']?.toString() ?? 'Ombi halikufaulu.',
            code: envelope['code']?.toString(),
            statusCode: error.response?.statusCode,
          );
        }
      }
      if (error.type == DioExceptionType.connectionError ||
          error.type == DioExceptionType.connectionTimeout) {
        return const ApiError(
          'Imeshindikana kuunganisha na huduma. Jaribu tena.',
        );
      }
      return ApiError(
        'Ombi halikufaulu. Jaribu tena.',
        statusCode: error.response?.statusCode,
      );
    }
    return const ApiError('Hitilafu isiyotarajiwa imetokea.');
  }

  @override
  String toString() => message;
}
