import { payHereService } from './app/utils/payhere.server.js';

console.log('🧪 Testing PayHere Configuration...\n');

// Test payment data
const testPayment = {
  orderId: `TEST_${Date.now()}`,
  amount: 1000.00,
  currency: 'LKR',
  items: 'Test Wallet Deposit - LKR 1000',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '0771234567',
  address: '123 Test Street',
  city: 'Colombo',
  country: 'Sri Lanka',
};

console.log('📊 Test Payment Data:');
console.log(JSON.stringify(testPayment, null, 2));

console.log('\n🔐 Generating Hash...');
const hash = payHereService.generateHash(testPayment);
console.log('Generated Hash:', hash);

console.log('\n🌐 PayHere URLs:');
console.log('Checkout URL:', payHereService.getCheckoutUrl());

console.log('\n📋 Form Data:');
const formData = payHereService.preparePaymentForm(testPayment);
console.log(JSON.stringify(formData, null, 2));

console.log('\n✨ PayHere.js Data:');
const jsData = {
  sandbox: process.env.PAYHERE_MODE === 'sandbox',
  merchant_id: formData.merchant_id,
  return_url: formData.return_url,
  cancel_url: formData.cancel_url,
  notify_url: formData.notify_url,
  order_id: formData.order_id,
  items: formData.items,
  amount: formData.amount,
  currency: formData.currency,
  hash: formData.hash,
  first_name: formData.first_name,
  last_name: formData.last_name,
  email: formData.email,
  phone: formData.phone,
  address: formData.address,
  city: formData.city,
  country: formData.country,
  custom_1: 'WALLET_DEPOSIT',
  custom_2: 'test_user_id',
};
console.log(JSON.stringify(jsData, null, 2));

console.log('\n🎯 Configuration Check:');
console.log('- Merchant ID:', process.env.PAYHERE_MERCHANT_ID ? '✅ Set' : '❌ Missing');
console.log('- Merchant Secret:', process.env.PAYHERE_MERCHANT_SECRET ? '✅ Set' : '❌ Missing');
console.log('- Mode:', process.env.PAYHERE_MODE || 'sandbox');
console.log('- Return URL:', process.env.PAYHERE_RETURN_URL || 'Not set');
console.log('- Cancel URL:', process.env.PAYHERE_CANCEL_URL || 'Not set');
console.log('- Notify URL:', process.env.PAYHERE_NOTIFY_URL || 'Not set');

console.log('\n✅ PayHere configuration test completed!');
