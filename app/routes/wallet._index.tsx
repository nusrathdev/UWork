import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getUserSession } from "~/utils/auth.server";
import { getUserWalletBalance, getWalletTransactions, getWithdrawalRequests } from "~/utils/wallet.server";
import { prisma } from "~/utils/db.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  // Get user data and wallet info
  const [user, walletBalance, transactions, withdrawals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        walletBalance: true
      }
    }),
    getUserWalletBalance(userId),
    getWalletTransactions(userId, 20),
    getWithdrawalRequests(userId)
  ]);

  if (!user) {
    return redirect("/auth/login");
  }

  return json({ user, walletBalance, transactions, withdrawals });
}

export default function WalletDashboard() {
  const { user, walletBalance, transactions, withdrawals } = useLoaderData<typeof loader>();

  const formatCurrency = (amount: number) => `LKR ${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'DEPOSIT': return '💰';
      case 'WITHDRAW': return '🏧';
      case 'PAYMENT_SENT': return '📤';
      case 'PAYMENT_RECEIVED': return '📥';
      case 'REFUND': return '↩️';
      case 'FEE': return '💳';
      default: return '💱';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'DEPOSIT':
      case 'PAYMENT_RECEIVED':
      case 'REFUND':
        return 'text-green-600';
      case 'WITHDRAW':
      case 'PAYMENT_SENT':
      case 'FEE':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getWithdrawalStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING': return 'bg-blue-100 text-blue-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'FAILED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Wallet</h1>
          <p className="text-gray-600">Manage your deposits, payments, and withdrawals</p>
        </div>

        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white mb-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Available Balance</p>
              <p className="text-3xl font-bold">{formatCurrency(walletBalance)}</p>
              <p className="text-blue-100 text-sm">Ready to spend</p>
            </div>
            <div className="text-6xl opacity-50">💰</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link
            to="/wallet/deposit"
            className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors text-center"
          >
            <div className="text-2xl mb-2">💳</div>
            <div className="font-medium">Deposit Money</div>
            <div className="text-sm opacity-90">Add funds via PayHere</div>
          </Link>

          <Link
            to="/wallet/withdraw"
            className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            <div className="text-2xl mb-2">🏧</div>
            <div className="font-medium">Withdraw Money</div>
            <div className="text-sm opacity-90">Transfer to bank account</div>
          </Link>

          <Link
            to="/payments"
            className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors text-center"
          >
            <div className="text-2xl mb-2">💰</div>
            <div className="font-medium">Payments</div>
            <div className="text-sm opacity-90">View payment history</div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Recent Transactions
            </h2>
            
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <p>No transactions yet</p>
                <p className="text-sm">Start by depositing some money!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">
                        {getTransactionIcon(transaction.type)}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">
                          {transaction.description}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatDate(transaction.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                        {transaction.type === 'DEPOSIT' || transaction.type === 'PAYMENT_RECEIVED' || transaction.type === 'REFUND' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Balance: {formatCurrency(transaction.balanceAfter)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {transactions.length > 0 && (
              <div className="mt-4 text-center">
                <Link
                  to="/wallet/transactions"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All Transactions →
                </Link>
              </div>
            )}
          </div>

          {/* Withdrawal Requests */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <span className="mr-2">🏧</span>
              Withdrawal Requests
            </h2>
            
            {withdrawals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">🏧</div>
                <p>No withdrawal requests</p>
                <p className="text-sm">Ready to cash out?</p>
                <Link
                  to="/wallet/withdraw"
                  className="inline-block mt-3 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                >
                  Request Withdrawal
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal.id}
                    className="p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getWithdrawalStatusColor(withdrawal.status)}`}>
                        {withdrawal.status}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(withdrawal.amount)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Requested: {formatDate(withdrawal.createdAt)}
                    </p>
                    {withdrawal.processedAt && (
                      <p className="text-sm text-gray-600">
                        Processed: {formatDate(withdrawal.processedAt)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">Quick Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  transactions
                    .filter(t => t.type === 'DEPOSIT')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </p>
              <p className="text-sm text-gray-600">Total Deposits</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(
                  transactions
                    .filter(t => t.type === 'PAYMENT_RECEIVED')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </p>
              <p className="text-sm text-gray-600">Payments Received</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(
                  transactions
                    .filter(t => t.type === 'PAYMENT_SENT')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </p>
              <p className="text-sm text-gray-600">Payments Sent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {formatCurrency(
                  transactions
                    .filter(t => t.type === 'WITHDRAW')
                    .reduce((sum, t) => sum + t.amount, 0)
                )}
              </p>
              <p className="text-sm text-gray-600">Total Withdrawn</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
