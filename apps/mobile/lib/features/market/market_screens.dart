import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../core/api/api_error.dart';
import '../../core/theme/app_theme.dart';
import '../auth/auth_controller.dart';
import '../auth/phone.dart';
import 'market_repository.dart';

final _money = NumberFormat.currency(
  locale: 'sw_TZ',
  symbol: 'TZS ',
  decimalDigits: 0,
);

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({
    super.key,
    required this.buyer,
    required this.pending,
  });
  final bool buyer;
  final bool pending;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wallet = ref.watch(walletProvider);
    return _Page(
      title: buyer ? 'Biashara yangu' : 'Shamba hadi sokoni',
      actions: [
        IconButton(
          tooltip: 'Taarifa',
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
          ),
          icon: const Icon(Icons.notifications_outlined),
        ),
      ],
      child: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(walletProvider);
          ref.invalidate(pricesProvider);
        },
        child: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(
                color: buyer ? AppTheme.clay : AppTheme.forest,
                borderRadius: BorderRadius.circular(24),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(
                    buyer ? Icons.storefront : Icons.grass,
                    color: AppTheme.maize,
                    size: 34,
                  ),
                  const SizedBox(height: 18),
                  Text(
                    buyer ? 'Nunua kwa uhakika' : 'Uza kwa bei iliyo wazi',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    buyer
                        ? 'Tengeneza hitaji na fuatilia usafirishaji.'
                        : 'Ona mahitaji yanayolingana na mazao yako.',
                    style: const TextStyle(color: Colors.white70),
                  ),
                ],
              ),
            ),
            if (pending) const _PendingBuyer(),
            const SizedBox(height: 16),
            Text(
              'Muhtasari',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 10),
            wallet.when(
              loading: () => const _LoadingCard(),
              error: (error, _) => _ErrorCard(
                error: error,
                retry: () => ref.invalidate(walletProvider),
              ),
              data: (data) => Row(
                children: [
                  Expanded(
                    child: _Metric(
                      label: 'Salio',
                      value: _money.format(
                        _num(data['availableBalance'] ?? data['balance']),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _Metric(
                      label: buyer ? 'Lililofungwa' : 'Linalosubiri',
                      value: _money.format(
                        _num(data['lockedBalance'] ?? data['pendingBalance']),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Card(
              child: ListTile(
                leading: const CircleAvatar(
                  backgroundColor: Color(0x1FB65D3A),
                  child: Icon(Icons.trending_up, color: AppTheme.clay),
                ),
                title: const Text('Bei za leo'),
                subtitle: const Text(
                  'Angalia bei rasmi kabla ya kufanya uamuzi.',
                ),
                trailing: const Icon(Icons.chevron_right),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class MarketScreen extends ConsumerWidget {
  const MarketScreen({super.key, required this.buyer, required this.pending});
  final bool buyer;
  final bool pending;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final prices = ref.watch(pricesProvider);
    final demands = ref.watch(demandsProvider(buyer));
    return DefaultTabController(
      length: 2,
      child: _Page(
        title: 'Soko',
        actions: [
          if (buyer)
            IconButton(
              tooltip: 'Hitaji jipya',
              onPressed: pending
                  ? null
                  : () => _createDemand(context, ref, prices.value ?? []),
              icon: const Icon(Icons.add_circle_outline),
            ),
        ],
        bottom: const TabBar(
          tabs: [
            Tab(text: 'Bei'),
            Tab(text: 'Mahitaji'),
          ],
        ),
        child: TabBarView(
          children: [
            _AsyncList(
              value: prices,
              empty: 'Hakuna bei zinazotumika sasa.',
              onRefresh: () async => ref.invalidate(pricesProvider),
              item: (data) {
                final crop = data['crop'] is Map
                    ? data['crop'] as Map
                    : const {};
                return Card(
                  child: ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: Color(0x1F214E34),
                      child: Icon(Icons.eco, color: AppTheme.forest),
                    ),
                    title: Text(
                      '${crop['name'] ?? 'Zao'}',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text('${data['region'] ?? 'Dodoma'} • kwa kilo'),
                    trailing: Text(
                      _money.format(_num(data['pricePerUnit'])),
                      style: const TextStyle(
                        color: AppTheme.clay,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ),
                );
              },
            ),
            Column(
              children: [
                if (buyer && pending) const _PendingBuyer(),
                Expanded(
                  child: _AsyncList(
                    value: demands,
                    empty: buyer
                        ? 'Bado hujaweka mahitaji.'
                        : 'Hakuna mahitaji yanayolingana sasa.',
                    onRefresh: () async =>
                        ref.invalidate(demandsProvider(buyer)),
                    item: (data) {
                      final crop = data['crop'] is Map
                          ? data['crop'] as Map
                          : const {};
                      return Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      '${crop['name'] ?? 'Zao'}',
                                      style: Theme.of(context)
                                          .textTheme
                                          .titleMedium
                                          ?.copyWith(
                                            fontWeight: FontWeight.bold,
                                          ),
                                    ),
                                  ),
                                  _Status('${data['status'] ?? 'open'}'),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Text(
                                '${data['quantityKg'] ?? 0} kg • ${_money.format(_num(data['pricePerKg']))}/kg',
                              ),
                              Text(
                                '${data['deliveryLocation'] ?? data['region'] ?? 'Dodoma'}',
                              ),
                              if (!buyer) ...[
                                const SizedBox(height: 12),
                                Align(
                                  alignment: Alignment.centerRight,
                                  child: FilledButton.tonal(
                                    onPressed: () => _commit(
                                      context,
                                      ref,
                                      data['id'].toString(),
                                    ),
                                    child: const Text('Jitolee kuuza'),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key, required this.buyer});
  final bool buyer;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(ordersProvider);
    return _Page(
      title: 'Oda',
      child: _AsyncList(
        value: orders,
        empty: 'Hakuna oda bado.',
        onRefresh: () async => ref.invalidate(ordersProvider),
        item: (data) {
          final status = '${data['status'] ?? ''}';
          final canAct =
              (buyer && status == 'delivered') ||
              (!buyer && status == 'committed');
          return Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          'Oda ${_shortId(data['id'])}',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      _Status(status),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '${data['quantityKg'] ?? 0} kg • ${_money.format(_num(data['totalAmount'] ?? data['sellerPayout']))}',
                  ),
                  if (canAct) ...[
                    const SizedBox(height: 12),
                    FilledButton.tonal(
                      onPressed: () => _orderAction(
                        context,
                        ref,
                        data['id'].toString(),
                        buyer,
                      ),
                      child: Text(
                        buyer ? 'Thibitisha kupokea' : 'Weka kama imefikishwa',
                      ),
                    ),
                  ],
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

class WalletScreen extends ConsumerWidget {
  const WalletScreen({super.key, required this.buyer});
  final bool buyer;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final wallet = ref.watch(walletProvider);
    return _Page(
      title: 'Pochi',
      child: RefreshIndicator(
        onRefresh: () async => ref.invalidate(walletProvider),
        child: ListView(
          padding: const EdgeInsets.all(18),
          children: [
            wallet.when(
              loading: () => const _LoadingCard(),
              error: (error, _) => _ErrorCard(
                error: error,
                retry: () => ref.invalidate(walletProvider),
              ),
              data: (data) => Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppTheme.forest,
                  borderRadius: BorderRadius.circular(24),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Salio linalopatikana',
                      style: TextStyle(color: Colors.white70),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _money.format(
                        _num(data['availableBalance'] ?? data['balance']),
                      ),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 30,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: () => _moneyDialog(context, ref, buyer),
              icon: Icon(buyer ? Icons.add_card : Icons.outbox),
              label: Text(buyer ? 'Ongeza fedha' : 'Toa fedha'),
            ),
            const SizedBox(height: 12),
            const Card(
              child: ListTile(
                leading: Icon(Icons.shield_outlined),
                title: Text('Malipo salama'),
                subtitle: Text(
                  'Fedha za oda hufungwa hadi mzigo uthibitishwe.',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key, required this.buyer});
  final bool buyer;
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider(buyer));
    return _Page(
      title: 'Wasifu',
      actions: [
        IconButton(
          tooltip: 'Taarifa',
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const NotificationsScreen()),
          ),
          icon: const Icon(Icons.notifications_outlined),
        ),
      ],
      child: ListView(
        padding: const EdgeInsets.all(18),
        children: [
          profile.when(
            loading: () => const _LoadingCard(),
            error: (error, _) => _ErrorCard(
              error: error,
              retry: () => ref.invalidate(profileProvider(buyer)),
            ),
            data: (data) {
              final details =
                  data[buyer ? 'buyerProfile' : 'sellerProfile'] is Map
                  ? data[buyer ? 'buyerProfile' : 'sellerProfile'] as Map
                  : data;
              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    children: [
                      const CircleAvatar(
                        radius: 34,
                        backgroundColor: AppTheme.forest,
                        child: Icon(
                          Icons.person,
                          size: 38,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${details['fullName'] ?? data['fullName'] ?? 'Mtumiaji'}',
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text('${data['phone'] ?? ''}'),
                      if (buyer) Text('${details['businessName'] ?? ''}'),
                    ],
                  ),
                ),
              );
            },
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () => ref.read(authControllerProvider.notifier).logout(),
            icon: const Icon(Icons.logout),
            label: const Text('Toka kwenye akaunti'),
          ),
        ],
      ),
    );
  }
}

class NotificationsScreen extends ConsumerWidget {
  const NotificationsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final data = ref.watch(notificationsProvider);
    return _Page(
      title: 'Taarifa',
      actions: [
        TextButton(
          onPressed: () async {
            await ref.read(marketRepositoryProvider).readAll();
            ref.invalidate(notificationsProvider);
          },
          child: const Text('Soma zote'),
        ),
      ],
      child: _AsyncList(
        value: data,
        empty: 'Hakuna taarifa mpya.',
        onRefresh: () async => ref.invalidate(notificationsProvider),
        item: (item) => Card(
          child: ListTile(
            leading: Icon(
              item['readAt'] == null
                  ? Icons.notifications_active
                  : Icons.notifications_none,
              color: AppTheme.clay,
            ),
            title: Text('${item['title'] ?? 'Mkulima Link'}'),
            subtitle: Text('${item['message'] ?? item['body'] ?? ''}'),
            onTap: () async {
              if (item['id'] != null) {
                await ref
                    .read(marketRepositoryProvider)
                    .readNotification(item['id'].toString());
              }
              ref.invalidate(notificationsProvider);
            },
          ),
        ),
      ),
    );
  }
}

class _Page extends StatelessWidget {
  const _Page({
    required this.title,
    required this.child,
    this.actions,
    this.bottom,
  });
  final String title;
  final Widget child;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
      actions: actions,
      bottom: bottom,
    ),
    body: SafeArea(child: child),
  );
}

class _AsyncList extends StatelessWidget {
  const _AsyncList({
    required this.value,
    required this.item,
    required this.empty,
    required this.onRefresh,
  });
  final AsyncValue<List<Map<String, dynamic>>> value;
  final Widget Function(Map<String, dynamic>) item;
  final String empty;
  final Future<void> Function() onRefresh;
  @override
  Widget build(BuildContext context) => value.when(
    loading: () => const Center(child: CircularProgressIndicator()),
    error: (error, _) => Center(
      child: _ErrorCard(error: error, retry: onRefresh),
    ),
    data: (items) => RefreshIndicator(
      onRefresh: onRefresh,
      child: items.isEmpty
          ? ListView(
              children: [
                SizedBox(height: MediaQuery.sizeOf(context).height * .22),
                Icon(
                  Icons.inbox_outlined,
                  size: 54,
                  color: Colors.grey.shade500,
                ),
                const SizedBox(height: 12),
                Text(empty, textAlign: TextAlign.center),
              ],
            )
          : ListView(
              padding: const EdgeInsets.all(14),
              children: items.map(item).toList(),
            ),
    ),
  );
}

class _ErrorCard extends StatelessWidget {
  const _ErrorCard({required this.error, required this.retry});
  final Object error;
  final void Function() retry;
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_outlined, color: AppTheme.clay),
            const SizedBox(height: 8),
            Text(ApiError.from(error).message, textAlign: TextAlign.center),
            TextButton(onPressed: retry, child: const Text('Jaribu tena')),
          ],
        ),
      ),
    ),
  );
}

class _LoadingCard extends StatelessWidget {
  const _LoadingCard();
  @override
  Widget build(BuildContext context) => const Card(
    child: SizedBox(
      height: 110,
      child: Center(child: CircularProgressIndicator()),
    ),
  );
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(color: Colors.black54)),
          const SizedBox(height: 7),
          FittedBox(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w800,
                color: AppTheme.forest,
              ),
            ),
          ),
        ],
      ),
    ),
  );
}

class _PendingBuyer extends StatelessWidget {
  const _PendingBuyer();
  @override
  Widget build(BuildContext context) => const Card(
    color: Color(0xFFFFF3D0),
    child: ListTile(
      leading: Icon(Icons.hourglass_top, color: AppTheme.clay),
      title: Text('Akaunti inasubiri idhini'),
      subtitle: Text(
        'Unaweza kuona taarifa, lakini utaweka hitaji baada ya kuidhinishwa.',
      ),
    ),
  );
}

class _Status extends StatelessWidget {
  const _Status(this.value);
  final String value;
  @override
  Widget build(BuildContext context) => Chip(
    label: Text(
      value.replaceAll('_', ' '),
      style: const TextStyle(fontSize: 11),
    ),
    visualDensity: VisualDensity.compact,
  );
}

num _num(dynamic value) => value is num ? value : num.tryParse('$value') ?? 0;
String _shortId(dynamic id) {
  final value = '$id';
  return value.length > 8 ? value.substring(0, 8).toUpperCase() : value;
}

Future<void> _run(
  BuildContext context,
  Future<void> Function() action,
  String success,
) async {
  final messenger = ScaffoldMessenger.of(context);
  try {
    await action();
    if (context.mounted) {
      messenger.showSnackBar(SnackBar(content: Text(success)));
    }
  } catch (error) {
    if (context.mounted) {
      messenger.showSnackBar(
        SnackBar(
          content: Text(ApiError.from(error).message),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    }
  }
}

Future<void> _commit(BuildContext context, WidgetRef ref, String id) async {
  final value = TextEditingController();
  final result = await showDialog<num>(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Kiasi cha kuuza'),
      content: TextField(
        controller: value,
        autofocus: true,
        keyboardType: TextInputType.number,
        decoration: const InputDecoration(labelText: 'Kilo'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Ghairi'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, num.tryParse(value.text)),
          child: const Text('Thibitisha'),
        ),
      ],
    ),
  );
  value.dispose();
  if (result == null || result <= 0 || !context.mounted) return;
  await _run(
    context,
    () => ref.read(marketRepositoryProvider).commit(id, result),
    'Umefanikiwa kujitolea kuuza.',
  );
  ref.invalidate(demandsProvider(false));
  ref.invalidate(ordersProvider);
}

Future<void> _orderAction(
  BuildContext context,
  WidgetRef ref,
  String id,
  bool buyer,
) async {
  await _run(
    context,
    () => ref.read(marketRepositoryProvider).updateOrder(id, buyer),
    buyer ? 'Mzigo umethibitishwa.' : 'Mzigo umewekwa kuwa umefikishwa.',
  );
  ref.invalidate(ordersProvider);
  ref.invalidate(walletProvider);
}

Future<void> _moneyDialog(
  BuildContext context,
  WidgetRef ref,
  bool buyer,
) async {
  final amount = TextEditingController();
  final phone = TextEditingController();
  var provider = 'MPESA';
  final accepted = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: Text(buyer ? 'Ongeza fedha' : 'Toa fedha'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amount,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Kiasi (TZS)'),
            ),
            const SizedBox(height: 10),
            DropdownButtonFormField(
              initialValue: provider,
              items: const ['MPESA', 'TIGO_PESA', 'AIRTEL_MONEY', 'HALOPESA']
                  .map(
                    (item) => DropdownMenuItem(value: item, child: Text(item)),
                  )
                  .toList(),
              onChanged: (value) => setState(() => provider = value!),
              decoration: const InputDecoration(labelText: 'Mtandao'),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: phone,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(labelText: 'Simu (si lazima)'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Ghairi'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Endelea'),
          ),
        ],
      ),
    ),
  );
  final amountValue = num.tryParse(amount.text);
  final phoneValue = phone.text.trim();
  amount.dispose();
  phone.dispose();
  if (accepted != true ||
      amountValue == null ||
      amountValue <= 0 ||
      !context.mounted) {
    return;
  }
  String? normalizedPhone;
  if (phoneValue.isNotEmpty) {
    try {
      normalizedPhone = normalizeTanzanianPhone(phoneValue);
    } catch (error) {
      if (context.mounted) {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('$error')));
      }
      return;
    }
  }
  await _run(
    context,
    () => ref
        .read(marketRepositoryProvider)
        .moveMoney(buyer, amountValue, provider, normalizedPhone),
    'Ombi la malipo limepokelewa.',
  );
  ref.invalidate(walletProvider);
}

Future<void> _createDemand(
  BuildContext context,
  WidgetRef ref,
  List<Map<String, dynamic>> prices,
) async {
  if (prices.isEmpty) {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Hakuna zao lenye bei ya sasa.')),
    );
    return;
  }
  String cropId = '${prices.first['cropId']}';
  final quantity = TextEditingController();
  final location = TextEditingController();
  final notes = TextEditingController();
  DateTime deadline = DateTime.now().add(const Duration(days: 3));
  final accepted = await showDialog<bool>(
    context: context,
    builder: (context) => StatefulBuilder(
      builder: (context, setState) => AlertDialog(
        title: const Text('Hitaji jipya'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButtonFormField(
                initialValue: cropId,
                items: prices.map((price) {
                  final crop = price['crop'] as Map?;
                  return DropdownMenuItem(
                    value: '${price['cropId']}',
                    child: Text('${crop?['name'] ?? 'Zao'}'),
                  );
                }).toList(),
                onChanged: (value) => cropId = value!,
                decoration: const InputDecoration(labelText: 'Zao'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: quantity,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Kiasi (kg)'),
              ),
              const SizedBox(height: 10),
              TextField(
                controller: location,
                decoration: const InputDecoration(
                  labelText: 'Eneo la kupokelea',
                ),
              ),
              const SizedBox(height: 10),
              ListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Mwisho wa kupokea'),
                subtitle: Text(DateFormat('dd/MM/yyyy').format(deadline)),
                trailing: const Icon(Icons.calendar_month),
                onTap: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: deadline,
                    firstDate: DateTime.now().add(const Duration(days: 3)),
                    lastDate: DateTime.now().add(const Duration(days: 365)),
                  );
                  if (picked != null) setState(() => deadline = picked);
                },
              ),
              TextField(
                controller: notes,
                decoration: const InputDecoration(
                  labelText: 'Maelezo (si lazima)',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Ghairi'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Weka hitaji'),
          ),
        ],
      ),
    ),
  );
  final quantityValue = num.tryParse(quantity.text);
  final locationValue = location.text;
  final notesValue = notes.text;
  quantity.dispose();
  location.dispose();
  notes.dispose();
  if (accepted != true ||
      quantityValue == null ||
      quantityValue <= 0 ||
      locationValue.trim().isEmpty ||
      !context.mounted) {
    return;
  }
  await _run(
    context,
    () => ref.read(marketRepositoryProvider).createDemand({
      'cropId': cropId,
      'quantityKg': quantityValue,
      'deliveryLocation': locationValue.trim(),
      'deliveryDeadline': deadline.toUtc().toIso8601String(),
      'region': 'Dodoma',
      if (notesValue.trim().isNotEmpty) 'notes': notesValue.trim(),
    }),
    'Hitaji limewekwa sokoni.',
  );
  ref.invalidate(demandsProvider(true));
}
