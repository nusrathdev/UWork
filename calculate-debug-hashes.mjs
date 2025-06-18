import crypto from 'crypto';

console.log('🔍 Calculating Correct Hashes for Debug Tests');
console.log('='.repeat(50));

const MERCHANT_ID = '4OVxzM0PLRQ4JFnJecjqk43Xi';
const MERCHANT_SECRET = '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo';

// Generate merchant secret hash (lowercase - this seems to be working)
const merchantSecretHash = crypto
  .createHash('md5')
  .update(MERCHANT_SECRET)
  .digest('hex');

console.log('🔐 Merchant Secret Hash (lowercase):', merchantSecretHash);

// Test Case 1: Minimal fields
const test1 = {
  order_id: 'MIN_TEST_1750082500000',
  amount: '10.00',
  currency: 'LKR'
};

const hashString1 = MERCHANT_ID + test1.order_id + test1.amount + test1.currency + merchantSecretHash;
const hash1 = crypto.createHash('md5').update(hashString1).digest('hex');

console.log('\n📋 Test Case 1 - Minimal Fields:');
console.log('- Hash String:', hashString1);
console.log('- Final Hash:', hash1);

// Test Case 2: Alternative format
const test2 = {
  order_id: 'ALT_TEST_1750082500001',
  amount: '1000',
  currency: 'LKR'
};

const hashString2 = MERCHANT_ID + test2.order_id + test2.amount + test2.currency + merchantSecretHash;
const hash2 = crypto.createHash('md5').update(hashString2).digest('hex');

console.log('\n📋 Test Case 2 - Alternative Format:');
console.log('- Hash String:', hashString2);
console.log('- Final Hash:', hash2);

// Test Case 3: Standard format (what should work)
const test3 = {
  order_id: 'STD_TEST_' + Date.now(),
  amount: '100.00',
  currency: 'LKR'
};

const hashString3 = MERCHANT_ID + test3.order_id + test3.amount + test3.currency + merchantSecretHash;
const hash3 = crypto.createHash('md5').update(hashString3).digest('hex');

console.log('\n📋 Test Case 3 - Standard Format:');
console.log('- Order ID:', test3.order_id);
console.log('- Hash String:', hashString3);
console.log('- Final Hash:', hash3);

console.log('\n🔧 Updated HTML with Correct Hashes:');
console.log(`Test 1 Hash: ${hash1}`);
console.log(`Test 2 Hash: ${hash2}`);
console.log(`Test 3 Hash: ${hash3}`);
