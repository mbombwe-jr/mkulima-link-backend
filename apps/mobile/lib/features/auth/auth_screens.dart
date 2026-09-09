import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/app_theme.dart';
import 'auth_controller.dart';

class AuthLanding extends ConsumerStatefulWidget {
  const AuthLanding({super.key, this.initialError});
  final String? initialError;

  @override
  ConsumerState<AuthLanding> createState() => _AuthLandingState();
}

class _AuthLandingState extends ConsumerState<AuthLanding> {
  final phone = TextEditingController();
  UserRole role = UserRole.seller;

  @override
  void dispose() {
    phone.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final session = auth.value;
    if (session?.stage == AuthStage.otp) return const OtpScreen();
    final error = session?.errorMessage ?? widget.initialError;
    final busy = session?.isBusy ?? auth.isLoading;
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const _BrandMark(),
                  const SizedBox(height: 32),
                  Text(
                    'Soko linalokua pamoja nawe',
                    style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w800,
                      color: AppTheme.forest,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Bei wazi, mahitaji halisi na malipo salama kwa wakulima na wanunuzi.',
                  ),
                  const SizedBox(height: 28),
                  SegmentedButton<UserRole>(
                    segments: const [
                      ButtonSegment(
                        value: UserRole.seller,
                        label: Text('Mkulima'),
                        icon: Icon(Icons.grass),
                      ),
                      ButtonSegment(
                        value: UserRole.buyer,
                        label: Text('Mnunuzi'),
                        icon: Icon(Icons.storefront),
                      ),
                    ],
                    selected: {role},
                    onSelectionChanged: busy
                        ? null
                        : (value) => setState(() => role = value.first),
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    key: const Key('phone-field'),
                    controller: phone,
                    keyboardType: TextInputType.phone,
                    autofillHints: const [AutofillHints.telephoneNumber],
                    decoration: const InputDecoration(
                      labelText: 'Namba ya simu',
                      hintText: '0712 345 678',
                      prefixIcon: Icon(Icons.phone_outlined),
                    ),
                  ),
                  if (error != null) ...[
                    const SizedBox(height: 12),
                    _InlineError(error),
                  ],
                  const SizedBox(height: 20),
                  FilledButton(
                    key: const Key('request-otp'),
                    onPressed: busy
                        ? null
                        : () => ref
                              .read(authControllerProvider.notifier)
                              .requestOtp(phone.text, role),
                    child: busy
                        ? const SizedBox.square(
                            dimension: 22,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Pata namba ya uthibitisho'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class OtpScreen extends ConsumerStatefulWidget {
  const OtpScreen({super.key});
  @override
  ConsumerState<OtpScreen> createState() => _OtpScreenState();
}

class _OtpScreenState extends ConsumerState<OtpScreen> {
  final otp = TextEditingController();
  @override
  void dispose() {
    otp.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final busy = auth.value?.isBusy ?? auth.isLoading;
    return Scaffold(
      appBar: AppBar(title: const Text('Thibitisha simu')),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.sms_outlined, size: 64, color: AppTheme.clay),
                const SizedBox(height: 16),
                Text(
                  'Weka tarakimu 6 ulizotumiwa',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: otp,
                  textAlign: TextAlign.center,
                  keyboardType: TextInputType.number,
                  maxLength: 6,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'Namba ya uthibitisho',
                  ),
                ),
                if (auth.value?.errorMessage != null)
                  _InlineError(auth.value!.errorMessage!),
                const SizedBox(height: 12),
                FilledButton(
                  onPressed: busy
                      ? null
                      : () => ref
                            .read(authControllerProvider.notifier)
                            .verifyOtp(otp.text),
                  child: busy
                      ? const CircularProgressIndicator()
                      : const Text('Thibitisha'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key, required this.session});
  final AuthSession session;
  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  final name = TextEditingController();
  final business = TextEditingController();
  final location = TextEditingController();
  final district = TextEditingController();
  final crops = TextEditingController();
  final pin = TextEditingController();
  String businessType = 'wholesaler';

  @override
  void dispose() {
    for (final item in [name, business, location, district, crops, pin]) {
      item.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final seller = widget.session.role == UserRole.seller;
    final auth = ref.watch(authControllerProvider);
    final busy = auth.value?.isBusy ?? auth.isLoading;
    return Scaffold(
      appBar: AppBar(
        title: Text(seller ? 'Wasifu wa mkulima' : 'Wasifu wa biashara'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Hatua ya mwisho',
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const Text(
                    'Jaza taarifa zako. Baada ya usajili utaingia tena kwa usalama.',
                  ),
                  const SizedBox(height: 20),
                  TextField(
                    controller: name,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Jina kamili'),
                  ),
                  const SizedBox(height: 12),
                  if (seller) ...[
                    TextField(
                      controller: district,
                      decoration: const InputDecoration(labelText: 'Wilaya'),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: crops,
                      decoration: const InputDecoration(
                        labelText: 'Mazao unayolima',
                        hintText: 'Mahindi, Alizeti',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: pin,
                      obscureText: true,
                      keyboardType: TextInputType.number,
                      maxLength: 4,
                      decoration: const InputDecoration(
                        labelText: 'PIN ya USSD (tarakimu 4)',
                      ),
                    ),
                  ] else ...[
                    TextField(
                      controller: business,
                      decoration: const InputDecoration(
                        labelText: 'Jina la biashara',
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField(
                      initialValue: businessType,
                      decoration: const InputDecoration(
                        labelText: 'Aina ya biashara',
                      ),
                      items: const [
                        DropdownMenuItem(
                          value: 'wholesaler',
                          child: Text('Muuzaji wa jumla'),
                        ),
                        DropdownMenuItem(
                          value: 'retailer',
                          child: Text('Muuzaji wa rejareja'),
                        ),
                        DropdownMenuItem(
                          value: 'processor',
                          child: Text('Mchakataji'),
                        ),
                        DropdownMenuItem(
                          value: 'aggregator',
                          child: Text('Mkusanyaji'),
                        ),
                      ],
                      onChanged: (value) => businessType = value!,
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: location,
                      decoration: const InputDecoration(
                        labelText: 'Eneo la kupokelea mazao',
                      ),
                    ),
                  ],
                  if (auth.value?.errorMessage != null)
                    _InlineError(auth.value!.errorMessage!),
                  const SizedBox(height: 16),
                  FilledButton(
                    onPressed: busy
                        ? null
                        : () {
                            final data = seller
                                ? <String, dynamic>{
                                    'fullName': name.text,
                                    'region': 'Dodoma',
                                    'district': district.text,
                                    'cropsGrown': crops.text
                                        .split(',')
                                        .map((e) => e.trim())
                                        .where((e) => e.isNotEmpty)
                                        .toList(),
                                    'ussdPin': pin.text,
                                  }
                                : <String, dynamic>{
                                    'fullName': name.text,
                                    'businessName': business.text,
                                    'businessType': businessType,
                                    'deliveryLocation': location.text,
                                    'region': 'Dodoma',
                                  };
                            ref
                                .read(authControllerProvider.notifier)
                                .register(data);
                          },
                    child: busy
                        ? const CircularProgressIndicator()
                        : const Text('Kamilisha usajili'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();
  @override
  Widget build(BuildContext context) => const Row(
    children: [
      CircleAvatar(
        radius: 25,
        backgroundColor: AppTheme.forest,
        child: Icon(Icons.eco, color: AppTheme.maize),
      ),
      SizedBox(width: 12),
      Text(
        'MKULIMA LINK',
        style: TextStyle(
          fontWeight: FontWeight.w900,
          letterSpacing: 1.2,
          color: AppTheme.forest,
          fontSize: 18,
        ),
      ),
    ],
  );
}

class _InlineError extends StatelessWidget {
  const _InlineError(this.message);
  final String message;
  @override
  Widget build(BuildContext context) => Semantics(
    liveRegion: true,
    child: Text(
      message,
      style: TextStyle(color: Theme.of(context).colorScheme.error),
    ),
  );
}
