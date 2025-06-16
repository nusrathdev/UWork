# UWork Payment System with PayHere Integration

## Overview

UWork implements a comprehensive payment system similar to Upwork, featuring secure escrow payments, work submissions, and milestone-based payments using PayHere as the payment gateway.

## Features

### 🔒 Secure Escrow System
- **Payment Protection**: All payments are held in secure escrow until work is completed
- **Dispute Resolution**: Built-in dispute handling mechanism
- **Auto-release**: Automatic payment release after 14 days if no disputes
- **Platform Fee**: 5% platform fee deducted from freelancer earnings

### 💳 PayHere Integration
- **Multiple Payment Methods**: Credit/Debit cards, Bank transfers, Digital wallets
- **Secure Processing**: All payments processed through PayHere's secure gateway
- **Real-time Notifications**: Instant payment status updates
- **Currency Support**: LKR (Sri Lankan Rupees) with multi-currency support

### 📋 Work Submission System
- **Deliverable Tracking**: Freelancers can submit work with descriptions and file attachments
- **Review Process**: Clients can approve, request revisions, or reject submissions
- **Version Control**: Track multiple submission versions and revisions
- **Approval Workflow**: Structured approval process before payment release

### 🎯 Milestone Payments
- **Project Breakdown**: Split large projects into smaller, manageable milestones
- **Progressive Payments**: Pay for work as milestones are completed
- **Flexible Structure**: Custom milestone amounts and deadlines
- **Individual Tracking**: Each milestone has its own approval and payment cycle

## Payment Flow (Upwork-style)

### 1. Project Award & Payment Setup
```
Client posts project → Freelancer applies → Client approves application → Client makes payment
```

### 2. Work Execution
```
Payment held in escrow → Freelancer works on project → Freelancer submits work
```

### 3. Review & Approval
```
Client reviews work → Approves/Requests revisions → Work approved → Payment released to freelancer
```

### 4. Payment Release
```
Client approval → Platform fee deducted → Payment released to freelancer → Transaction complete
```

## API Endpoints

### Payment Creation
- `POST /payment/:applicationId` - Create payment for approved application
- `GET /payment/success` - Payment success callback
- `GET /payment/cancel` - Payment cancellation page
- `POST /api/payment/notify` - PayHere webhook for payment notifications

### Work Management
- `GET /work/:applicationId` - View work submission interface
- `POST /work/:applicationId` - Submit work or handle client actions
- `GET /payments` - View all payments and escrow status

## Environment Variables

```bash
# PayHere Configuration
PAYHERE_MERCHANT_ID=your_merchant_id
PAYHERE_MERCHANT_SECRET=your_merchant_secret
PAYHERE_MODE=sandbox # or 'live' for production
PAYHERE_CURRENCY=LKR
PAYHERE_RETURN_URL=http://localhost:3000/payment/success
PAYHERE_CANCEL_URL=http://localhost:3000/payment/cancel
PAYHERE_NOTIFY_URL=http://localhost:3000/api/payment/notify
```

## Database Schema

### Core Payment Models
- **Payment**: Main payment record with escrow status
- **EscrowRelease**: Handles payment release workflow
- **WorkSubmission**: Tracks deliverable submissions
- **Milestone**: Manages milestone-based payments

### Key Relationships
- Applications can have multiple payments
- Payments can have multiple milestones
- Work submissions are linked to applications
- Escrow releases are tied to payments

## Usage Examples

### 1. Making a Payment (Client)
```tsx
// Navigate to payment page
<Link to={`/payment/${applicationId}`}>
  Make Payment
</Link>

// Payment automatically redirects to PayHere
// Client completes payment on PayHere gateway
// Funds are held in escrow
```

### 2. Submitting Work (Freelancer)
```tsx
// Submit work through the work interface
<Form method="post">
  <input type="hidden" name="action" value="submit_work" />
  <input name="title" placeholder="Submission title" />
  <textarea name="description" placeholder="Work description" />
  <button type="submit">Submit Work</button>
</Form>
```

### 3. Approving Work (Client)
```tsx
// Client reviews and approves work
<Form method="post">
  <input type="hidden" name="action" value="approve_work" />
  <input type="hidden" name="submissionId" value={submissionId} />
  <button type="submit">Approve Work</button>
</Form>
```

## Security Features

### Payment Security
- **Hash Verification**: All PayHere notifications are verified using MD5 hash
- **SSL/TLS**: All payment communications are encrypted
- **PCI Compliance**: PayHere handles PCI compliance requirements
- **Fraud Detection**: Built-in fraud detection mechanisms

### Escrow Protection
- **Funds Isolation**: Client funds are held separately until work approval
- **Dispute Resolution**: Structured dispute handling process
- **Automatic Release**: Fail-safe automatic release mechanism
- **Audit Trail**: Complete payment history and audit logs

## Integration Steps

### 1. PayHere Account Setup
1. Create PayHere merchant account
2. Get merchant ID and secret key
3. Configure webhook URLs
4. Set up currency and payment methods

### 2. Environment Configuration
1. Copy `.env.example` to `.env`
2. Fill in PayHere credentials
3. Set appropriate URLs for your environment
4. Configure database URL

### 3. Database Migration
```bash
npx prisma db push
npx prisma generate
```

### 4. Testing
1. Use PayHere sandbox mode for testing
2. Test payment flow end-to-end
3. Verify webhook notifications
4. Test escrow release process

## Error Handling

### Payment Failures
- **Network Issues**: Automatic retry mechanism
- **Invalid Payments**: Proper error messages and fallback
- **Webhook Failures**: Redundant notification handling
- **Database Errors**: Transaction rollback and recovery

### User Experience
- **Loading States**: Clear payment processing indicators
- **Error Messages**: User-friendly error explanations
- **Recovery Options**: Options to retry failed payments
- **Support Contact**: Easy access to support for issues

## Best Practices

### For Clients
- Make payments only after approving applications
- Review work submissions promptly
- Provide clear feedback for revisions
- Release payments after satisfactory completion

### For Freelancers
- Submit high-quality work with clear descriptions
- Respond to revision requests promptly
- Keep communication professional
- Request payment release after client approval

### For Platform Admins
- Monitor escrow balances regularly
- Handle disputes fairly and promptly
- Maintain PayHere integration health
- Review platform fees and pricing

## Monitoring & Analytics

### Payment Metrics
- Total payments processed
- Average payment amount
- Payment success rate
- Escrow release times

### User Behavior
- Payment completion rates
- Work submission patterns
- Client approval rates
- Dispute frequency

## Support & Troubleshooting

### Common Issues
1. **Payment Not Received**: Check PayHere dashboard and webhook logs
2. **Escrow Not Released**: Verify work approval status
3. **Webhook Failures**: Check server logs and network connectivity
4. **Hash Verification Errors**: Verify merchant secret configuration

### Debug Tools
- PayHere sandbox environment
- Webhook testing tools
- Payment status monitoring
- Database query tools

## Future Enhancements

### Planned Features
- **Multi-currency Support**: Support for USD, EUR, etc.
- **Recurring Payments**: For ongoing projects
- **Payment Scheduling**: Scheduled milestone payments
- **Advanced Analytics**: Detailed payment reporting
- **Mobile App Integration**: Native mobile payment support

### API Improvements
- **GraphQL API**: More efficient data fetching
- **Real-time Updates**: WebSocket-based payment updates
- **Batch Operations**: Bulk payment processing
- **Advanced Filtering**: Enhanced payment search and filtering

---

## License

This payment system is part of the UWork platform and follows the same licensing terms.

## Contributing

Please refer to the main project contributing guidelines for payment system contributions.
