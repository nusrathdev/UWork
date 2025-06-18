import crypto from 'crypto';

console.log('🔍 Calculating Hashes for Field Validation Tests');
console.log('='.repeat(50));

const MERCHANT_ID = '4OVxzM0PLRQ4JFnJecjqk43Xi';
const MERCHANT_SECRET = '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo';

// Generate merchant secret hash (lowercase)
const merchantSecretHash = crypto
  .createHash('md5')
  .update(MERCHANT_SECRET)
  .digest('hex');

console.log('🔐 Merchant Secret Hash:', merchantSecretHash);

// Test cases for field validation
const testCases = [
  {
    name: 'Phone Test (+94 format)',
    order_id: 'PHONE_TEST_1750082700000',
    amount: '100.00',
    currency: 'LKR'
  },
  {
    name: 'Local Phone Test (0xx format)',
    order_id: 'LOCAL_TEST_1750082700001',
    amount: '100.00',
    currency: 'LKR'
  },
  {
    name: 'Minimal Fields Test',
    order_id: 'MINIMAL_TEST_1750082700002',
    amount: '100.00',
    currency: 'LKR'
  }
];

testCases.forEach((test, index) => {
  const hashString = MERCHANT_ID + test.order_id + test.amount + test.currency + merchantSecretHash;
  const hash = crypto.createHash('md5').update(hashString).digest('hex');
  
  console.log(`\n📋 ${test.name}:`);
  console.log(`- Hash String: ${hashString}`);
  console.log(`- Final Hash: ${hash}`);
  console.log(`- Placeholder${index + 1} should be: ${hash}`);
});

console.log('\n🔧 Update the HTML file with these hashes:');
testCases.forEach((test, index) => {
  const hashString = MERCHANT_ID + test.order_id + test.amount + test.currency + merchantSecretHash;
  const hash = crypto.createHash('md5').update(hashString).digest('hex');
  console.log(`placeholder${index + 1} → ${hash}`);
});
