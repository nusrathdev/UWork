import crypto from 'crypto';

console.log('🔍 PayHere Hash Generation Debug - Using Your Exact Credentials');
console.log('='.repeat(60));

// Your exact credentials
const MERCHANT_ID = '4OVxzM0PLRQ4JFnJecjqk43Xi';
const MERCHANT_SECRET = '4TsZMkxZfWf49dBKrpnxuo4qAYIYm1g1M8MS9U2IPXlo';

// Test data
const testData = {
  order_id: 'TEST_ORDER_' + Date.now(),
  amount: '100.00',
  currency: 'LKR'
};

console.log('📋 Test Data:');
console.log('- Merchant ID:', MERCHANT_ID);
console.log('- Merchant Secret:', MERCHANT_SECRET.substring(0, 10) + '...' + MERCHANT_SECRET.substring(-10));
console.log('- Order ID:', testData.order_id);
console.log('- Amount:', testData.amount);
console.log('- Currency:', testData.currency);

console.log('\n🔐 Hash Generation Methods:');

// Method 1: Current implementation
console.log('\n1️⃣ Current Implementation:');
const merchantSecretHash1 = crypto
  .createHash('md5')
  .update(MERCHANT_SECRET)
  .digest('hex')
  .toUpperCase();

const hashString1 = `${MERCHANT_ID}${testData.order_id}${testData.amount}${testData.currency}${merchantSecretHash1}`;
const finalHash1 = crypto
  .createHash('md5')
  .update(hashString1)
  .digest('hex')
  .toUpperCase();

console.log('- Merchant Secret Hash:', merchantSecretHash1);
console.log('- Hash String:', hashString1);
console.log('- Final Hash:', finalHash1);

// Method 2: Try with lowercase
console.log('\n2️⃣ With Lowercase Hashes:');
const merchantSecretHash2 = crypto
  .createHash('md5')
  .update(MERCHANT_SECRET)
  .digest('hex')
  .toLowerCase();

const hashString2 = `${MERCHANT_ID}${testData.order_id}${testData.amount}${testData.currency}${merchantSecretHash2}`;
const finalHash2 = crypto
  .createHash('md5')
  .update(hashString2)
  .digest('hex')
  .toLowerCase();

console.log('- Merchant Secret Hash:', merchantSecretHash2);
console.log('- Hash String:', hashString2);
console.log('- Final Hash:', finalHash2);

// Method 3: PayHere official documentation format
console.log('\n3️⃣ PayHere Official Format:');
// According to PayHere docs: hash = MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))
const merchantSecretMd5 = crypto
  .createHash('md5')
  .update(MERCHANT_SECRET)
  .digest('hex');

const hashString3 = MERCHANT_ID + testData.order_id + testData.amount + testData.currency + merchantSecretMd5;
const finalHash3 = crypto
  .createHash('md5')
  .update(hashString3)
  .digest('hex');

console.log('- Merchant Secret MD5:', merchantSecretMd5);
console.log('- Hash String:', hashString3);
console.log('- Final Hash:', finalHash3);

// Method 4: With UTF-8 encoding explicitly
console.log('\n4️⃣ With UTF-8 Encoding:');
const merchantSecretHash4 = crypto
  .createHash('md5')
  .update(MERCHANT_SECRET, 'utf8')
  .digest('hex')
  .toUpperCase();

const hashString4 = `${MERCHANT_ID}${testData.order_id}${testData.amount}${testData.currency}${merchantSecretHash4}`;
const finalHash4 = crypto
  .createHash('md5')
  .update(hashString4, 'utf8')
  .digest('hex')
  .toUpperCase();

console.log('- Merchant Secret Hash:', merchantSecretHash4);
console.log('- Hash String:', hashString4);
console.log('- Final Hash:', finalHash4);

// Create complete form data for testing
const createFormData = (hash, method) => ({
  merchant_id: MERCHANT_ID,
  return_url: 'https://httpbin.org/status/200',
  cancel_url: 'https://httpbin.org/status/200',
  notify_url: 'https://httpbin.org/post',
  order_id: testData.order_id,
  items: 'Test Payment',
  currency: testData.currency,
  amount: testData.amount,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '0771234567',
  address: 'Colombo',
  city: 'Colombo',
  country: 'Sri Lanka',
  hash: hash
});

console.log('\n📋 Form Data Options:');
console.log('\n🔹 Method 1 (Current - Uppercase):');
console.log(JSON.stringify(createFormData(finalHash1, 'Method 1'), null, 2));

console.log('\n🔹 Method 2 (Lowercase):');
console.log(JSON.stringify(createFormData(finalHash2, 'Method 2'), null, 2));

console.log('\n🔹 Method 3 (Official Format):');
console.log(JSON.stringify(createFormData(finalHash3, 'Method 3'), null, 2));

console.log('\n💡 Testing Instructions:');
console.log('1. Copy each form data set above');
console.log('2. Create separate HTML test files for each method');
console.log('3. Test each one to see which hash format PayHere accepts');
console.log('4. The working method will be the correct hash generation');

// Generate test HTML files
const generateTestHTML = (formData, methodName) => `
<!DOCTYPE html>
<html>
<head>
    <title>PayHere Test - ${methodName}</title>
</head>
<body>
    <h2>PayHere Test - ${methodName}</h2>
    <form method="POST" action="https://sandbox.payhere.lk/pay/checkout">
        ${Object.entries(formData).map(([key, value]) => 
          `<input type="hidden" name="${key}" value="${value}">`
        ).join('\n        ')}
        <button type="submit" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
            Test ${methodName}
        </button>
    </form>
    <h3>Hash Details:</h3>
    <p><strong>Hash:</strong> ${formData.hash}</p>
    <p><strong>Method:</strong> ${methodName}</p>
</body>
</html>
`;

console.log('\n📄 Generating test HTML files...');

// You can save these as separate files and test each one
const htmlFiles = [
  { name: 'test-method1.html', content: generateTestHTML(createFormData(finalHash1, 'Method 1'), 'Method 1 (Current)') },
  { name: 'test-method2.html', content: generateTestHTML(createFormData(finalHash2, 'Method 2'), 'Method 2 (Lowercase)') },
  { name: 'test-method3.html', content: generateTestHTML(createFormData(finalHash3, 'Method 3'), 'Method 3 (Official)') }
];

htmlFiles.forEach(file => {
  console.log(`\n📁 ${file.name}:`);
  console.log(file.content);
  console.log('\n' + '='.repeat(50));
});

console.log('\n🎯 Next Steps:');
console.log('1. Save the HTML content above as 3 separate files');
console.log('2. Test each file in your browser');
console.log('3. See which one works (if any)');
console.log('4. If none work, the issue might be with account verification or PayHere server-side validation');
