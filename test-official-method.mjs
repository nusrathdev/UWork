import crypto from 'crypto';

console.log('🎉 OFFICIAL PAYHERE DOCUMENTATION METHOD');
console.log('='.repeat(60));

const MERCHANT_ID = '4OVxzM0PLRQ4JFnJecjqk43Xi';
const MERCHANT_SECRET = '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo';

// Official PayHere hash generation from documentation
function generateOfficialHash(orderId, amount, currency) {
  // Step 1: Generate merchant secret hash (UPPERCASE)
  const merchantSecretHash = crypto
    .createHash('md5')
    .update(MERCHANT_SECRET)
    .digest('hex')
    .toUpperCase();
  
  // Step 2: Format amount exactly as documentation: number_format($amount, 2, '.', '')
  const formattedAmount = parseFloat(amount).toFixed(2);
  
  // Step 3: Create hash string
  const hashString = MERCHANT_ID + orderId + formattedAmount + currency + merchantSecretHash;
  
  // Step 4: Generate final hash (UPPERCASE)
  const finalHash = crypto
    .createHash('md5')
    .update(hashString)
    .digest('hex')
    .toUpperCase();
  
  return {
    merchantSecretHash,
    formattedAmount,
    hashString,
    finalHash
  };
}

console.log('📋 Official PayHere Documentation Method:');
console.log('hash = strtoupper(md5(merchant_id + order_id + number_format(amount, 2) + currency + strtoupper(md5(merchant_secret))))');

// Test case
const testOrder = {
  orderId: 'OFFICIAL_TEST_' + Date.now(),
  amount: 100.00,
  currency: 'LKR'
};

const result = generateOfficialHash(testOrder.orderId, testOrder.amount, testOrder.currency);

console.log('\n🔍 Step-by-step Generation:');
console.log('1. Merchant Secret Hash (UPPERCASE):', result.merchantSecretHash);
console.log('2. Formatted Amount:', result.formattedAmount);
console.log('3. Hash String:', result.hashString);
console.log('4. Final Hash (UPPERCASE):', result.finalHash);

console.log('\n📋 Complete Form Data:');
const formData = {
  merchant_id: MERCHANT_ID,
  return_url: 'https://httpbin.org/status/200',
  cancel_url: 'https://httpbin.org/status/200',
  notify_url: 'https://httpbin.org/post',
  order_id: testOrder.orderId,
  items: 'Test Payment',
  currency: testOrder.currency,
  amount: result.formattedAmount,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '0771234567',
  address: 'Colombo',
  city: 'Colombo',
  country: 'Sri Lanka',
  hash: result.finalHash
};

console.log(JSON.stringify(formData, null, 2));

console.log('\n🎯 KEY INSIGHTS FROM DOCUMENTATION:');
console.log('1. ✅ Hash should be UPPERCASE (not lowercase)');
console.log('2. ✅ Merchant secret hash should be UPPERCASE');
console.log('3. ✅ Amount should be formatted with .toFixed(2)');
console.log('4. ✅ Final hash should be UPPERCASE');

console.log('\n🚀 ERROR 072016062551 ANALYSIS:');
console.log('This error likely occurred because we were using lowercase hash');
console.log('The official documentation clearly shows UPPERCASE is required');
console.log('This should be the FINAL FIX!');

console.log('\n💡 NEXT STEPS:');
console.log('1. ✅ PayHere service updated with official method');
console.log('2. 🧪 Test your wallet deposit now');
console.log('3. 🎉 Should work with official hash generation!');

console.log('\n🏆 YOUR WALLET DEPOSIT SHOULD NOW WORK:');
console.log('Go to: http://localhost:5173/wallet/deposit');
console.log('The hash generation now matches PayHere documentation exactly!');
