// Simple PayHere Environment Test
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🔍 Testing PayHere Environment Configuration...\n');

// Check if all required environment variables are set
const requiredEnvVars = [
  'PAYHERE_MERCHANT_ID',
  'PAYHERE_MERCHANT_SECRET', 
  'PAYHERE_MODE',
  'PAYHERE_CURRENCY',
  'PAYHERE_RETURN_URL',
  'PAYHERE_CANCEL_URL',
  'PAYHERE_NOTIFY_URL'
];

let allEnvVarsPresent = true;

requiredEnvVars.forEach(envVar => {
  const value = process.env[envVar];
  if (value) {
    console.log(`✅ ${envVar}: ${envVar.includes('SECRET') ? '***HIDDEN***' : value}`);
  } else {
    console.log(`❌ ${envVar}: MISSING`);
    allEnvVarsPresent = false;
  }
});

if (!allEnvVarsPresent) {
  console.log('\n❌ Some environment variables are missing!');
  process.exit(1);
}

console.log('\n🎉 All required PayHere environment variables are present!');
console.log('\n📋 Configuration Summary:');
console.log(`   • Merchant ID: ${process.env.PAYHERE_MERCHANT_ID}`);
console.log(`   • Mode: ${process.env.PAYHERE_MODE.toUpperCase()}`);
console.log(`   • Currency: ${process.env.PAYHERE_CURRENCY}`);
console.log(`   • Return URL: ${process.env.PAYHERE_RETURN_URL}`);
console.log(`   • Cancel URL: ${process.env.PAYHERE_CANCEL_URL}`);
console.log(`   • Notify URL: ${process.env.PAYHERE_NOTIFY_URL}`);

// Validate PayHere credentials format
const merchantId = process.env.PAYHERE_MERCHANT_ID;
const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;

console.log('\n🔍 Validating credential formats...');

if (merchantId && merchantId.length > 10) {
  console.log('✅ Merchant ID format looks valid');
} else {
  console.log('❌ Merchant ID format seems invalid (too short)');
}

if (merchantSecret && merchantSecret.length > 20) {
  console.log('✅ Merchant Secret format looks valid');
} else {
  console.log('❌ Merchant Secret format seems invalid (too short)');
}

if (process.env.PAYHERE_MODE === 'sandbox' || process.env.PAYHERE_MODE === 'live') {
  console.log('✅ PayHere mode is valid');
} else {
  console.log('❌ PayHere mode should be either "sandbox" or "live"');
}

console.log('\n✨ Environment configuration test completed!');
