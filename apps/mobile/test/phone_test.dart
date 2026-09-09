import 'package:flutter_test/flutter_test.dart';
import 'package:mkulima_app/features/auth/phone.dart';

void main() {
  group('normalizeTanzanianPhone', () {
    test('normalizes common Tanzania formats', () {
      expect(normalizeTanzanianPhone('0712 345 678'), '+255712345678');
      expect(normalizeTanzanianPhone('255712345678'), '+255712345678');
      expect(normalizeTanzanianPhone('+255 712-345-678'), '+255712345678');
    });

    test('rejects an invalid number', () {
      expect(() => normalizeTanzanianPhone('1234'), throwsFormatException);
    });
  });
}
