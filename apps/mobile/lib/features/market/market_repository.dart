import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/api/api_client.dart';

final marketRepositoryProvider = Provider<MarketRepository>(
  (ref) => MarketRepository(ref.read(apiClientProvider)),
);
final pricesProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>(
  (ref) => ref.read(marketRepositoryProvider).prices(),
);
final demandsProvider = FutureProvider.autoDispose
    .family<List<Map<String, dynamic>>, bool>(
      (ref, buyer) => ref.read(marketRepositoryProvider).demands(buyer),
    );
final ordersProvider = FutureProvider.autoDispose<List<Map<String, dynamic>>>(
  (ref) => ref.read(marketRepositoryProvider).orders(),
);
final walletProvider = FutureProvider.autoDispose<Map<String, dynamic>>(
  (ref) => ref.read(marketRepositoryProvider).wallet(),
);
final notificationsProvider =
    FutureProvider.autoDispose<List<Map<String, dynamic>>>(
      (ref) => ref.read(marketRepositoryProvider).notifications(),
    );
final profileProvider = FutureProvider.autoDispose
    .family<Map<String, dynamic>, bool>(
      (ref, buyer) => ref.read(marketRepositoryProvider).profile(buyer),
    );

class MarketRepository {
  MarketRepository(this.api);
  final ApiClient api;

  Future<List<Map<String, dynamic>>> prices() async =>
      _list(await api.get('/prices'));
  Future<List<Map<String, dynamic>>> demands(bool buyer) async => _list(
    await api.get(
      buyer ? '/demands/mine' : '/demands',
      query: {'page': 1, 'limit': 50},
    ),
  );
  Future<List<Map<String, dynamic>>> orders() async =>
      _list(await api.get('/orders/mine', query: {'page': 1, 'limit': 50}));
  Future<List<Map<String, dynamic>>> notifications() async =>
      _list(await api.get('/notifications', query: {'page': 1, 'limit': 50}));
  Future<Map<String, dynamic>> wallet() async =>
      Map<String, dynamic>.from(await api.get('/wallet/me') as Map);
  Future<Map<String, dynamic>> profile(bool buyer) async =>
      Map<String, dynamic>.from(
        await api.get(buyer ? '/buyers/me' : '/sellers/me') as Map,
      );
  Future<void> createDemand(Map<String, dynamic> data) async =>
      api.post('/demands', data: data);
  Future<void> commit(String demandId, num quantity) async =>
      api.post('/orders', data: {'demandId': demandId, 'quantityKg': quantity});
  Future<void> updateOrder(String id, bool buyer) async =>
      api.post('/orders/$id/${buyer ? 'confirm' : 'delivered'}', data: {});
  Future<void> moveMoney(
    bool buyer,
    num amount,
    String provider,
    String? phone,
  ) async => api.post(
    '/wallet/${buyer ? 'topup' : 'withdraw'}',
    data: {'amount': amount, 'provider': provider, 'phone': ?phone},
  );
  Future<void> readNotification(String id) async =>
      api.post('/notifications/$id/read');
  Future<void> readAll() async => api.post('/notifications/read-all');

  List<Map<String, dynamic>> _list(dynamic response) {
    final value = response is Map
        ? (response['data'] ?? response['items'])
        : response;
    if (value is! List) return [];
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }
}
