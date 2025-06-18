import crypto from 'crypto';

// Test with different configurations to isolate the PayHere error
console.log('🔍 PayHere Error Code 081916062526 Analysis');
console.log('='.repeat(50));

// This error typically means:
console.log('📋 Common causes of PayHere error 081916062526:');
console.log('1. Invalid Merchant ID or Secret');
console.log('2. Incorrect hash generation');
console.log('3. Invalid amount format');
console.log('4. Missing required fields');
console.log('5. Invalid URL format (notify_url not accessible)');
console.log('6. Sandbox vs Live environment mismatch');
console.log('7. Special characters in data fields');

console.log('\n🧪 Let\'s test minimal PayHere form data:');

// Minimal test configuration
const testConfig = {
  merchant_id: '4OVxzM0PLRQ4JFnJecjqk43Xi',
  merchant_secret: '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo',
  order_id: 'TEST_ORDER_' + Date.now(),
  amount: '100.00',
  currency: 'LKR',
  items: 'Test Item',
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '0771234567',
  address: 'Colombo',
  city: 'Colombo',
  country: 'Sri Lanka',
  return_url: 'https://httpbin.org/status/200',
  cancel_url: 'https://httpbin.org/status/200',
  notify_url: 'https://httpbin.org/post'
};

// Generate hash
const merchantSecretHash = crypto
  .createHash('md5')
  .update(testConfig.merchant_secret)
  .digest('hex')
  .toUpperCase();

const hashString = `${testConfig.merchant_id}${testConfig.order_id}${testConfig.amount}${testConfig.currency}${merchantSecretHash}`;
const hash = crypto
  .createHash('md5')
  .update(hashString)
  .digest('hex')
  .toUpperCase();

console.log('🔐 Hash Generation:');
console.log('- Merchant Secret Hash:', merchantSecretHash);
console.log('- Hash String:', hashString);
console.log('- Final Hash:', hash);

// Create minimal form data
const minimalFormData = {
  merchant_id: testConfig.merchant_id,
  return_url: testConfig.return_url,
  cancel_url: testConfig.cancel_url,
  notify_url: testConfig.notify_url,
  order_id: testConfig.order_id,
  items: testConfig.items,
  currency: testConfig.currency,
  amount: testConfig.amount,
  first_name: testConfig.first_name,
  last_name: testConfig.last_name,
  email: testConfig.email,
  phone: testConfig.phone,
  address: testConfig.address,
  city: testConfig.city,
  country: testConfig.country,
  hash: hash
};

console.log('\n📋 Minimal Form Data (with public URLs):');
console.log(JSON.stringify(minimalFormData, null, 2));

console.log('\n🌐 Note: Using httpbin.org for testing URLs (publicly accessible)');
console.log('- This eliminates the "notify URL not accessible" issue');
console.log('- If this still fails with same error, issue is likely with credentials or hash');

console.log('\n🔧 Troubleshooting steps:');
console.log('1. Copy the above form data');
console.log('2. Create a simple HTML form and test manually');
console.log('3. Check PayHere merchant dashboard for any restrictions');
console.log('4. Verify sandbox merchant credentials are active');

console.log('\n💡 Alternative solutions:');
console.log('1. Contact PayHere support with error code 081916062526');
console.log('2. Use a different payment gateway (Stripe, PayPal)');
console.log('3. Test with different merchant credentials');

// Generate HTML form for manual testing
const htmlForm = `
<!DOCTYPE html>
<html>
<head>
    <title>PayHere Test Form</title>
</head>
<body>
    <h2>PayHere Test Payment</h2>
    <form method="POST" action="https://sandbox.payhere.lk/pay/checkout">
        ${Object.entries(minimalFormData).map(([key, value]) => 
          `<input type="hidden" name="${key}" value="${value}">`
        ).join('\n        ')}
        <button type="submit">Pay with PayHere</button>
    </form>
    <h3>Form Data:</h3>
    <pre>${JSON.stringify(minimalFormData, null, 2)}</pre>
</body>
</html>
`;

console.log('\n📄 Generated test HTML form - save as test-payhere.html:');
console.log('='.repeat(50));
console.log(htmlForm);
