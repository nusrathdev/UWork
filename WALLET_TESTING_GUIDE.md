# UWork Wallet System - Testing Guide

## Overview
The UWork platform now has a complete wallet-based payment system that allows:
- **Clients** to deposit funds into their wallet via PayHere
- **Secure escrow-style payments** from wallet to freelancers
- **Freelancers** to withdraw funds to their bank accounts
- **Complete transaction history** and wallet management

## Database Schema
The wallet system includes these new models:
- `User.walletBalance` - Current wallet balance for each user
- `WalletTransaction` - All wallet transactions (deposits, withdrawals, payments)
- `WithdrawalRequest` - Bank withdrawal requests from freelancers

## Test Users & Credentials

### 1. John Smith (Client)
- **Email**: john.client@example.com  
- **Password**: password123
- **Wallet Balance**: LKR 50,000
- **Role**: Posts projects and pays freelancers

### 2. Alice Johnson (Freelancer)
- **Email**: alice.freelancer@example.com
- **Password**: password123  
- **Wallet Balance**: LKR 25,000
- **Skills**: React, Node.js, TypeScript, Python

### 3. Bob Wilson (Freelancer)
- **Email**: bob.developer@example.com
- **Password**: password123
- **Wallet Balance**: LKR 15,000  
- **Skills**: React Native, Flutter, UI/UX Design

### 4. Sarah Davis (Freelancer)
- **Email**: sarah.designer@example.com
- **Password**: password123
- **Wallet Balance**: LKR 10,000
- **Skills**: Graphic Design, Branding, Logo Design

## Sample Projects (Pre-created)
1. **E-commerce Website** - LKR 75,000 (Alice applied & approved)
2. **Mobile App UI/UX** - LKR 35,000 (Bob applied & approved)  
3. **Company Branding** - LKR 25,000 (Sarah applied & approved)

## Testing the Wallet System

### 1. Start the Application
```bash
npm run dev
```
Navigate to: http://localhost:3000

### 2. Test Wallet Dashboard
1. Login as any user
2. Go to `/wallet` to see:
   - Current balance
   - Recent transactions
   - Deposit/withdraw buttons
   - Transaction history

### 3. Test Wallet Deposit
1. Login as John (client with LKR 50,000)
2. Go to `/wallet/deposit`
3. Enter amount (e.g., LKR 5,000)
4. Click "Deposit via PayHere"
5. Use PayHere sandbox for testing:
   - **Card**: 4916217501611292
   - **Expiry**: 12/25
   - **CVV**: 411
   - **Name**: Test User

### 4. Test Wallet-to-Wallet Payment
1. As John (client), go to approved applications
2. Make payment - it should deduct from wallet
3. Check freelancer's wallet for payment received
4. Verify transaction history shows payment sent/received

### 5. Test Withdrawal Request
1. Login as a freelancer (Alice, Bob, or Sarah)
2. Go to `/wallet/withdraw`
3. Enter withdrawal amount
4. Fill bank details:
   - **Bank**: Commercial Bank of Ceylon
   - **Account**: 123456789
   - **Holder**: [Your Name]
5. Submit withdrawal request
6. Check wallet for withdrawal transaction

### 6. Test Transaction History
1. Go to `/wallet/transactions`
2. View complete transaction history
3. Filter by transaction type
4. Verify balances are calculated correctly

## API Endpoints

### Wallet Routes
- `GET /wallet` - Wallet dashboard
- `GET /wallet/deposit` - Deposit funds form
- `POST /wallet/deposit` - Process deposit via PayHere
- `GET /wallet/withdraw` - Withdrawal request form
- `POST /wallet/withdraw` - Submit withdrawal request
- `GET /wallet/transactions` - View transaction history

### Payment Notification
- `POST /api/payment/notify` - PayHere webhook for deposits

## Payment Flow

### Traditional Project Payment
1. Client pays project via PayHere
2. Funds held in escrow
3. Client releases funds to freelancer
4. Freelancer can withdraw to bank

### New Wallet-Based Payment  
1. Client deposits to wallet via PayHere
2. Client pays project from wallet balance
3. Instant transfer to freelancer's wallet
4. Freelancer can withdraw to bank anytime

## Database Operations

### Check User Wallets
```javascript
// In browser console or Node.js script
const user = await prisma.user.findUnique({
  where: { email: "john.client@example.com" },
  select: { name: true, walletBalance: true }
});
console.log(user); // Should show wallet balance
```

### View Transactions
```javascript
const transactions = await prisma.walletTransaction.findMany({
  where: { userId: "user-id-here" },
  orderBy: { createdAt: 'desc' },
  take: 10
});
console.log(transactions);
```

## Security Features
- ✅ PayHere hash verification for deposits
- ✅ User authentication for all wallet operations  
- ✅ Transaction atomicity (database transactions)
- ✅ Balance validation before operations
- ✅ Audit trail for all wallet transactions

## Admin Features (Future)
- View all wallet transactions
- Process withdrawal requests
- Generate financial reports
- Handle disputes and refunds

## Troubleshooting

### If Wallet Balance Shows 0
1. Check if Prisma client was regenerated: `npx prisma generate`
2. Verify database schema: `npx prisma db push`
3. Re-run seed script: `node seed-wallet-system.mjs`

### If PayHere Payments Fail
1. Check environment variables in `.env`
2. Verify PayHere sandbox credentials
3. Check webhook URL configuration
4. Review server logs for errors

### If Transactions Don't Appear
1. Check database connection
2. Verify transaction was committed
3. Check for TypeScript errors
4. Review browser network tab for API errors

## Testing Checklist
- [ ] User can view wallet balance
- [ ] User can deposit funds via PayHere
- [ ] User can make wallet-to-wallet payments
- [ ] User can request withdrawals
- [ ] Transaction history displays correctly
- [ ] Balances update after each transaction
- [ ] PayHere webhook processes deposits
- [ ] Error handling works properly
- [ ] Authentication protects wallet routes

## Next Steps
1. Implement admin panel for withdrawal processing
2. Add email notifications for transactions
3. Integrate with actual bank API for withdrawals
4. Add transaction search and filtering
5. Implement spending limits and security features
6. Add multi-currency support
7. Create financial reporting dashboard

---

**🎉 The UWork wallet system is now fully functional and ready for testing!**

Use this guide to test all wallet features and ensure everything works as expected.
