import crypto from 'crypto';

console.log('🔍 Final Hash Calculations for Error 471916062518');
console.log('='.repeat(60));

const MERCHANT_ID = '4OVxzM0PLRQ4JFnJecjqk43Xi';
const MERCHANT_SECRET = '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo';

// Generate merchant secret hash (lowercase)
const merchantSecretHash = crypto
  .createHash('md5')
  .update(MERCHANT_SECRET)
  .digest('hex');

console.log('🔐 Merchant Secret Hash:', merchantSecretHash);

// Final test cases to solve 471916062518
const finalTests = [
  {
    name: 'Test 1 - Integer Amount',
    order_id: 'ORDER1750083300001',
    amount: '100', // No decimals
    currency: 'LKR'
  },
  {
    name: 'Test 2 - Different Items',
    order_id: 'TEST123456789',
    amount: '50.00',
    currency: 'LKR'
  },
  {
    name: 'Test 3 - Ultra Simple',
    order_id: 'T123',
    amount: '10', // Minimal integer
    currency: 'LKR'
  }
];

finalTests.forEach((test, index) => {
  const hashString = MERCHANT_ID + test.order_id + test.amount + test.currency + merchantSecretHash;
  const hash = crypto.createHash('md5').update(hashString).digest('hex');
  
  console.log(`\n📋 ${test.name}:`);
  console.log(`- Order ID: ${test.order_id}`);
  console.log(`- Amount: ${test.amount}`);
  console.log(`- Hash String: ${hashString}`);
  console.log(`- Final Hash: ${hash}`);
});

console.log('\n🔧 HTML Placeholder Updates:');
finalTests.forEach((test, index) => {
  const hashString = MERCHANT_ID + test.order_id + test.amount + test.currency + merchantSecretHash;
  const hash = crypto.createHash('md5').update(hashString).digest('hex');
  console.log(`placeholder${index + 1} → ${hash}`);
});

console.log('\n🎯 Error 471916062518 - This is likely THE final test!');
console.log('🏆 Success means COMPLETE PayHere integration working!');
console.log('🚀 Your wallet system will be fully functional!');
