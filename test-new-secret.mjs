import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

console.log('🧪 Testing NEW PayHere Merchant Secret...\n');

// Test configuration
const merchantId = process.env.PAYHERE_MERCHANT_ID;
const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;
const orderId = `TEST_${Date.now()}`;
const amount = 1000.00;
const currency = 'LKR';

console.log('📊 Configuration:');
console.log('- Merchant ID:', merchantId);
console.log('- Secret (first 10 chars):', merchantSecret?.substring(0, 10) + '...');
console.log('- Order ID:', orderId);
console.log('- Amount:', amount.toFixed(2));
console.log('- Currency:', currency);

// Generate hash using the official PayHere method
console.log('\n🔐 Generating hash...');
const merchantSecretHash = crypto
  .createHash('md5')
  .update(merchantSecret)
  .digest('hex')
  .toUpperCase();

const hashString = `${merchantId}${orderId}${amount.toFixed(2)}${currency}${merchantSecretHash}`;
const hash = crypto
  .createHash('md5')
  .update(hashString)
  .digest('hex')
  .toUpperCase();

console.log('- Merchant Secret Hash:', merchantSecretHash);
console.log('- Hash String:', hashString);
console.log('- Final Hash:', hash);

console.log('\n✅ Hash generation completed!');
console.log('\n🎯 Next Steps:');
console.log('1. Complete domain approval in PayHere dashboard');
console.log('2. Restart your development server');
console.log('3. Test the deposit functionality');

// Prepare test payment data
const testPaymentData = {
  sandbox: true,
  merchant_id: merchantId,
  return_url: process.env.PAYHERE_RETURN_URL,
  cancel_url: process.env.PAYHERE_CANCEL_URL,
  notify_url: process.env.PAYHERE_NOTIFY_URL,
  order_id: orderId,
  items: `Test Wallet Deposit - LKR ${amount}`,
  amount: amount.toFixed(2),
  currency: currency,
  hash: hash,
  first_name: 'Test',
  last_name: 'User',
  email: 'test@example.com',
  phone: '0771234567',
  address: 'Test Address',
  city: 'Colombo',
  country: 'Sri Lanka',
  custom_1: 'WALLET_DEPOSIT',
  custom_2: 'test_user_id',
};

console.log('\n💳 Test Payment Data:');
console.log(JSON.stringify(testPaymentData, null, 2));
