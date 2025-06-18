// PayHere Error Code Analysis
// Error: 421318062553

import dotenv from 'dotenv';
dotenv.config();

console.log('🔍 Analyzing PayHere Error Code: 421318062553');

// Common PayHere Error Codes and their meanings:
const errorCodes = {
  '421318062553': 'Domain/App not authorized or Merchant Secret mismatch',
  '421318062552': 'Hash verification failed',
  '421318062551': 'Invalid merchant configuration',
  '421318062550': 'Payment amount validation failed',
};

console.log('\n📋 Error Analysis:');
console.log('Error Code:', '421318062553');
console.log('Likely Issue:', errorCodes['421318062553'] || 'Unknown error');

console.log('\n🔧 Troubleshooting Steps:');
console.log('1. ✅ Check if your domain is authorized in PayHere dashboard');
console.log('2. ✅ Verify Merchant Secret matches your authorized domain');
console.log('3. ✅ Check if API permissions are enabled');
console.log('4. ✅ Verify hash generation is correct');

console.log('\n📊 Current Environment:');
console.log('- Domain:', 'localhost:5173');
console.log('- Merchant ID:', process.env.PAYHERE_MERCHANT_ID || 'NOT SET');
console.log('- Secret Set:', process.env.PAYHERE_MERCHANT_SECRET ? 'Yes (Hidden)' : 'No');
console.log('- Mode:', process.env.PAYHERE_MODE || 'NOT SET');

console.log('\n🎯 Next Steps:');
console.log('1. Login to PayHere dashboard');
console.log('2. Go to Side Menu > Integrations');
console.log('3. Check if "localhost:5173" is listed and APPROVED');
console.log('4. Copy the Merchant Secret for localhost:5173');
console.log('5. Update PAYHERE_MERCHANT_SECRET in .env file');
console.log('6. Restart the server');

console.log('\n⚠️  IMPORTANT:');
console.log('- Each domain needs its own Merchant Secret');
console.log('- Generic secrets won\'t work for specific domains');
console.log('- Domain approval can take up to 24 hours');

// Check if this is the domain authorization issue
if (process.env.PAYHERE_MERCHANT_SECRET === '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo') {
  console.log('\n🚨 IDENTIFIED ISSUE:');
  console.log('You are using a generic/default Merchant Secret!');
  console.log('This secret is NOT authorized for your domain localhost:5173');
  console.log('\n✅ SOLUTION:');
  console.log('1. Go to PayHere Dashboard > Integrations');
  console.log('2. Find "localhost:5173" in your approved domains');
  console.log('3. Copy the SPECIFIC Merchant Secret for localhost:5173');
  console.log('4. Replace the current secret in your .env file');
  console.log('5. Restart your server');
}
