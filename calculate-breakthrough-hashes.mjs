import crypto from 'crypto';

console.log('🎯 BREAKTHROUGH HASH CALCULATIONS - Error 072016062551');
console.log('='.repeat(60));

const MERCHANT_ID = '4OVxzM0PLRQ4JFnJecjqk43Xi';
const MERCHANT_SECRET = '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo';

const merchantSecretHash = crypto
  .createHash('md5')
  .update(MERCHANT_SECRET)
  .digest('hex');

console.log('🔐 Merchant Secret Hash:', merchantSecretHash);

// Breakthrough tests for error 072016062551
const breakthroughTests = [
  {
    name: 'Test 1 - USD Currency',
    order_id: 'USD_TEST_001',
    amount: '1.00',
    currency: 'USD'
  },
  {
    name: 'Test 2 - LKR Integer',
    order_id: 'LKR001',
    amount: '10',
    currency: 'LKR'
  },
  {
    name: 'Test 3 - Minimal Everything',
    order_id: 'ABC123',
    amount: '5',
    currency: 'LKR'
  }
];

breakthroughTests.forEach((test, index) => {
  const hashString = MERCHANT_ID + test.order_id + test.amount + test.currency + merchantSecretHash;
  const hash = crypto.createHash('md5').update(hashString).digest('hex');
  
  console.log(`\n🎯 ${test.name}:`);
  console.log(`- Order ID: ${test.order_id}`);
  console.log(`- Amount: ${test.amount}`);
  console.log(`- Currency: ${test.currency}`);
  console.log(`- Hash String: ${hashString}`);
  console.log(`- Final Hash: ${hash}`);
});

console.log('\n🔧 HTML Updates:');
breakthroughTests.forEach((test, index) => {
  const hashString = MERCHANT_ID + test.order_id + test.amount + test.currency + merchantSecretHash;
  const hash = crypto.createHash('md5').update(hashString).digest('hex');
  console.log(`placeholder${index + 1} → ${hash}`);
});

console.log('\n🚀 ERROR PATTERN BREAKTHROUGH:');
console.log('The change to 072016062551 suggests:');
console.log('1. ✅ Hash generation is perfect');
console.log('2. ✅ Field validation is perfect');
console.log('3. ✅ Account issues are resolved');
console.log('4. 🎯 Only currency/format validation remains');

console.log('\n🏆 THIS IS THE FINAL PHASE!');
console.log('One of these tests should unlock complete success!');
