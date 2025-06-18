// Simple PayHere hash test
import crypto from 'crypto';

const merchantId = '4OVxzM0PLRQ4JFnJecjqk43Xi';
const merchantSecret = '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo';
const orderId = 'WALLET_DEPOSIT_1734368400000';
const amount = 1000.00;
const currency = 'LKR';

console.log('🧪 Testing PayHere Hash Generation...\n');

// Step 1: Create MD5 hash of merchant secret
const merchantSecretHash = crypto
  .createHash('md5')
  .update(merchantSecret)
  .digest('hex')
  .toUpperCase();

console.log(`Merchant Secret Hash: ${merchantSecretHash}`);

// Step 2: Create hash string
const hashString = `${merchantId}${orderId}${amount.toFixed(2)}${currency}${merchantSecretHash}`;
console.log(`Hash String: ${hashString}`);

// Step 3: Create final hash
const finalHash = crypto
  .createHash('md5')
  .update(hashString)
  .digest('hex')
  .toUpperCase();

console.log(`Final Hash: ${finalHash}`);

// Test data that would be sent to PayHere
const formData = {
  merchant_id: merchantId,
  return_url: 'http://localhost:5173/payment/success',
  cancel_url: 'http://localhost:5173/payment/cancel',
  notify_url: 'http://localhost:5173/api/payment/notify',
  order_id: orderId,
  items: 'Wallet Deposit',
  currency: currency,
  amount: amount.toFixed(2),
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '0771234567',
  address: 'Colombo',
  city: 'Colombo',
  country: 'Sri Lanka',
  hash: finalHash,
  custom_1: 'user123',
  custom_2: 'WALLET_DEPOSIT'
};

console.log('\n📝 Form Data:');
console.log(JSON.stringify(formData, null, 2));

console.log('\n💡 PayHere Error 081916062526 usually means:');
console.log('1. Invalid merchant credentials');
console.log('2. Incorrect hash generation');
console.log('3. Missing required fields');
console.log('4. Invalid amount format');
console.log('5. Network/URL accessibility issues');

console.log('\n🔍 Troubleshooting steps:');
console.log('1. Verify merchant_id and merchant_secret in PayHere dashboard');
console.log('2. Ensure notify_url is publicly accessible');
console.log('3. Check if amount format is correct (decimal with 2 places)');
console.log('4. Verify all required fields are present');
