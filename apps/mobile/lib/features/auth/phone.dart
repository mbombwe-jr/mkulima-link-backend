String normalizeTanzanianPhone(String input) {
  var value = input.replaceAll(RegExp(r'[\s()-]'), '');
  if (value.startsWith('+255')) value = value.substring(4);
  if (value.startsWith('255')) value = value.substring(3);
  if (value.startsWith('0')) value = value.substring(1);
  if (!RegExp(r'^\d{9}$').hasMatch(value)) {
    throw const FormatException('Weka namba halali ya Tanzania.');
  }
  return '+255$value';
}
