console.log('🧪 Testing PayHere Integration...\n');

// Import crypto module
const crypto = await import('crypto');

// Test 1: Payment Hash Generation Logic
console.log('1. Testing Payment Hash Generation Logic:');
const testPaymentData = {
  orderId: 'TEST-12345',
  amount: 1000.00,
  currency: 'LKR',
  merchantId: process.env.PAYHERE_MERCHANT_ID || 'test_merchant',
  merchantSecret: process.env.PAYHERE_MERCHANT_SECRET || 'test_secret',
};

try {
  // Replicate the hash generation logic
  const merchantSecretHash = crypto
    .createHash('md5')
    .update(testPaymentData.merchantSecret)
    .digest('hex')
    .toUpperCase();
  
  const hashString = `${testPaymentData.merchantId}${testPaymentData.orderId}${testPaymentData.amount.toFixed(2)}${testPaymentData.currency}${merchantSecretHash}`;
  
  const hash = crypto
    .createHash('md5')
    .update(hashString)
    .digest('hex')
    .toUpperCase();
  
  console.log('✅ Hash generated successfully:', hash);
  console.log('   - Hash string:', hashString);
} catch (error) {
  console.log('❌ Hash generation failed:', error.message);
}

// Test 2: Notification Hash Verification
console.log('\n2. Testing Notification Hash Verification:');
const testNotificationData = {
  merchant_id: process.env.PAYHERE_MERCHANT_ID || 'test_merchant',
  order_id: 'TEST-12345',
  payment_id: 'PAY-12345',
  amount: '1000.00',
  currency: 'LKR',
  status_code: '2',
};

try {
  // Generate a test hash manually
  const merchantSecretHash2 = crypto
    .createHash('md5')
    .update(process.env.PAYHERE_MERCHANT_SECRET || 'test_secret')
    .digest('hex')
    .toUpperCase();

  const hashString2 = `${testNotificationData.merchant_id}${testNotificationData.order_id}${testNotificationData.amount}${testNotificationData.currency}${testNotificationData.status_code}${merchantSecretHash2}`;
  const testHash = crypto
    .createHash('md5')
    .update(hashString2)
    .digest('hex')
    .toUpperCase();

  console.log('✅ Notification hash generated:', testHash);
  console.log('   - Hash string:', hashString2);
} catch (error) {
  console.log('❌ Hash verification failed:', error.message);
}

// Test 3: Environment Variables
console.log('\n3. Checking Environment Variables:');
const requiredEnvVars = [
  'PAYHERE_MERCHANT_ID',
  'PAYHERE_MERCHANT_SECRET',
  'PAYHERE_MODE',
  'PAYHERE_CURRENCY',
  'PAYHERE_RETURN_URL',
  'PAYHERE_CANCEL_URL',
  'PAYHERE_NOTIFY_URL'
];

requiredEnvVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.length > 20 ? value.substring(0, 20) + '...' : value}`);
  } else {
    console.log(`❌ ${varName}: Not set`);
  }
});

console.log('\n🔧 Setup Instructions:');
console.log('1. Copy .env.example to .env');
console.log('2. Update PayHere credentials in .env file');
console.log('3. Run: npm run db:push');
console.log('4. Run: npm run dev');
console.log('\n📖 See PAYMENT_INTEGRATION.md for detailed setup instructions');
