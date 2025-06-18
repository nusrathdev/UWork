import crypto from 'crypto';

console.log('🔍 DEBUGGING CURRENT HASH GENERATION');
console.log('='.repeat(50));

const MERCHANT_ID = '4OVxzM0PLRQ4JFnJecjqk43Xi';
const MERCHANT_SECRET = '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo';

// Test the exact same method now used in payhere.server.ts
function testCurrentMethod(orderId, amount, currency) {
  console.log('\n📋 Testing Current PayHere Service Method:');
  
  // Step 1: Merchant secret hash (UPPERCASE)
  const merchantSecretHash = crypto
    .createHash('md5')
    .update(MERCHANT_SECRET)
    .digest('hex')
    .toUpperCase();
  
  console.log('1. Merchant Secret Hash (UPPERCASE):', merchantSecretHash);
  
  // Step 2: Format amount
  const formattedAmount = amount.toFixed(2);
  console.log('2. Formatted Amount:', formattedAmount);
  
  // Step 3: Create hash string
  const hashString = `${MERCHANT_ID}${orderId}${formattedAmount}${currency}${merchantSecretHash}`;
  console.log('3. Hash String:', hashString);
  
  // Step 4: Final hash (UPPERCASE)
  const finalHash = crypto
    .createHash('md5')
    .update(hashString)
    .digest('hex')
    .toUpperCase();
  
  console.log('4. Final Hash (UPPERCASE):', finalHash);
  
  return finalHash;
}

// Test with current timestamp
const testOrder = {
  orderId: `WALLET_DEPOSIT_${Date.now()}_test123`,
  amount: 100.00,
  currency: 'LKR'
};

console.log('🧪 Test Order:', testOrder);
const hash = testCurrentMethod(testOrder.orderId, testOrder.amount, testOrder.currency);

console.log('\n📋 Complete Test Form Data:');
const formData = {
  merchant_id: MERCHANT_ID,
  return_url: 'https://httpbin.org/status/200',
  cancel_url: 'https://httpbin.org/status/200',
  notify_url: 'https://httpbin.org/post',
  order_id: testOrder.orderId,
  items: 'Wallet Deposit',
  currency: testOrder.currency,
  amount: testOrder.amount.toFixed(2),
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '0771234567',
  address: 'Colombo',
  city: 'Colombo',
  country: 'Sri Lanka',
  hash: hash
};

console.log(JSON.stringify(formData, null, 2));

console.log('\n❓ DEBUGGING QUESTIONS:');
console.log('1. What error code are you getting now?');
console.log('2. Is it the same 072016062551 or different?');
console.log('3. Are you testing in the app or HTML files?');
console.log('4. Does the PayHere popup appear at all?');

console.log('\n🔧 NEXT STEPS:');
console.log('1. Copy the form data above and test manually');
console.log('2. Try your wallet deposit: http://localhost:5173/wallet/deposit');
console.log('3. Let me know the exact error you\'re seeing');

console.log('\n💡 If still getting errors, we may need to:');
console.log('- Check PayHere account verification status');
console.log('- Try different amounts or field values');
console.log('- Contact PayHere support directly');
console.log('- Consider alternative payment methods');
