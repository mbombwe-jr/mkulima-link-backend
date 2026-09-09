import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mkulima_app/core/api/api_error.dart';

void main() {
  test('maps backend error envelope', () {
    final request = RequestOptions(path: '/orders');
    final error = DioException(
      requestOptions: request,
      response: Response(
        requestOptions: request,
        statusCode: 422,
        data: {
          'error': {'code': 'REQUEST_FAILED', 'message': 'Only 100kg remains'},
        },
      ),
    );

    final mapped = ApiError.from(error);
    expect(mapped.message, 'Only 100kg remains');
    expect(mapped.code, 'REQUEST_FAILED');
    expect(mapped.statusCode, 422);
  });
}
