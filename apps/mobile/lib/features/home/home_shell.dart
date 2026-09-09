import 'package:flutter/material.dart';

import '../auth/auth_controller.dart';
import '../market/market_screens.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.session});
  final AuthSession session;
  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int index = 0;
  @override
  Widget build(BuildContext context) {
    final buyer = widget.session.role == UserRole.buyer;
    final pages = [
      DashboardScreen(buyer: buyer, pending: widget.session.pendingBuyer),
      MarketScreen(buyer: buyer, pending: widget.session.pendingBuyer),
      OrdersScreen(buyer: buyer),
      WalletScreen(buyer: buyer),
      ProfileScreen(buyer: buyer),
    ];
    return Scaffold(
      body: IndexedStack(index: index, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (value) => setState(() => index = value),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home),
            label: 'Mwanzo',
          ),
          NavigationDestination(
            icon: Icon(Icons.agriculture_outlined),
            selectedIcon: Icon(Icons.agriculture),
            label: 'Soko',
          ),
          NavigationDestination(
            icon: Icon(Icons.local_shipping_outlined),
            selectedIcon: Icon(Icons.local_shipping),
            label: 'Oda',
          ),
          NavigationDestination(
            icon: Icon(Icons.account_balance_wallet_outlined),
            selectedIcon: Icon(Icons.account_balance_wallet),
            label: 'Pochi',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person),
            label: 'Wasifu',
          ),
        ],
      ),
    );
  }
}
