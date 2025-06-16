# PayHere Payment Integration

## Overview

This implementation adds PayHere payment gateway integration to UWork, enabling secure payments between clients and freelancers with escrow functionality.

## Features

### 🔐 Secure Payment Processing
- PayHere gateway integration for Sri Lankan market
- MD5 hash verification for security
- Support for sandbox and live modes

### 💰 Escrow System
- Payments held in secure escrow until work completion
- Client approval required for payment release
- Dispute resolution system
- Platform fee calculation (5%)

### 📊 Payment Management
- Payment history tracking
- Real-time status updates
- Comprehensive payment dashboard
- Email notifications for payment events

## Setup Instructions

### 1. Environment Configuration

Update your `.env` file with PayHere credentials:

```bash
# PayHere Configuration
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_MERCHANT_SECRET=your_merchant_secret
PAYHERE_MODE=sandbox  # or 'live' for production
PAYHERE_CURRENCY=LKR
PAYHERE_RETURN_URL=http://localhost:3000/payment/success
PAYHERE_CANCEL_URL=http://localhost:3000/payment/cancel
PAYHERE_NOTIFY_URL=http://localhost:3000/api/payment/notify
```

### 2. Database Migration

Run the following commands to update your database schema:

```bash
npm run db:push
```

This will create the new payment-related tables:
- `Payment` - Stores payment transactions
- `EscrowRelease` - Manages escrow release process

### 3. PayHere Account Setup

1. Sign up for a PayHere merchant account at https://www.payhere.lk/
2. Get your Merchant ID and Merchant Secret from the dashboard
3. Configure your notification URL in PayHere dashboard: `yourdomain.com/api/payment/notify`

## Usage Flow

### For Clients (Project Owners)

1. **Approve Application**: Approve a freelancer's application
2. **Make Payment**: Click "Make Payment" button in dashboard
3. **PayHere Checkout**: Complete payment through PayHere gateway
4. **Escrow Holding**: Payment is held in secure escrow
5. **Release Payment**: Approve work completion to release funds

### For Freelancers

1. **Receive Notification**: Get notified when payment is made
2. **Complete Work**: Deliver the project work
3. **Request Release**: Request payment release when work is done
4. **Receive Payment**: Get paid after client approval (minus 5% platform fee)

## API Endpoints

### Payment Routes
- `GET /payment/:applicationId` - Payment page
- `POST /payment/:applicationId` - Process payment
- `GET /payment/success` - Payment success page
- `GET /payment/cancel` - Payment cancellation page
- `POST /api/payment/notify` - PayHere notification webhook

### Management Routes
- `GET /payments` - Payment dashboard
- `POST /payments` - Escrow management actions

## Security Features

- **Hash Verification**: All PayHere notifications are verified with MD5 hash
- **Escrow Protection**: Funds held until work completion
- **Platform Fee**: Automatic calculation and deduction
- **Dispute Resolution**: Built-in dispute handling system

## Testing

### Sandbox Mode

PayHere provides sandbox mode for testing:
- Use test card numbers provided by PayHere
- Set `PAYHERE_MODE=sandbox` in environment variables
- Test notification URL with PayHere's webhook tester

### Test Cards

Use PayHere's test card numbers in sandbox mode:
- Visa: 4916217501611292
- MasterCard: 5313581000123430
- CVV: Any 3 digits
- Expiry: Any future date

## Troubleshooting

### Common Issues

1. **Invalid Hash Error**: Check merchant secret configuration
2. **Notification Not Received**: Verify notification URL is publicly accessible
3. **Payment Stuck in Pending**: Check PayHere dashboard for payment status

### Logs

Payment processing logs are available in the console:
```bash
npm run dev
```

Look for:
- PayHere notification received
- Hash verification results
- Payment status updates

## Production Deployment

### Before Going Live

1. Switch to live mode: `PAYHERE_MODE=live`
2. Update URLs to production domain
3. Test with small amounts first
4. Monitor payment notifications
5. Set up proper error handling and logging

### Security Checklist

- [ ] Use HTTPS for all payment URLs
- [ ] Verify notification URL is secure
- [ ] Test hash verification thoroughly
- [ ] Monitor for suspicious payment activity
- [ ] Set up payment failure alerts

## Support

For PayHere-specific issues:
- PayHere Documentation: https://support.payhere.lk/
- PayHere Support: support@payhere.lk

For implementation issues:
- Check console logs for detailed error messages
- Verify environment variables are properly set
- Test with PayHere's sandbox environment first
