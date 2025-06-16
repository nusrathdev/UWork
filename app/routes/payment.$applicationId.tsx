import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useActionData, Link } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { getUserSession } from "~/utils/auth.server";
import { getUserWalletBalance, transferBetweenWallets } from "~/utils/wallet.server";
import { createPayment } from "~/utils/payment.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const applicationId = params.applicationId;
  if (!applicationId) {
    throw new Error("Application ID is required");
  }

  // Get application details with project and users
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      project: {
        include: {
          owner: true,
        },
      },
      freelancer: true,
    },
  });

  if (!application) {
    throw new Error("Application not found");
  }

  // Only project owner can make payment
  if (application.project.ownerId !== userId) {
    throw new Error("Unauthorized to make payment for this application");
  }
  // Check if application is approved
  if (application.status !== "APPROVED") {
    throw new Error("Application must be approved before payment");
  }

  // Get user's wallet balance
  const walletBalance = await getUserWalletBalance(userId);

  return json({ application, walletBalance });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const applicationId = params.applicationId;
  if (!applicationId) {
    return json({ error: "Application ID is required" }, { status: 400 });
  }
  try {
    // Get application details
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: {
          include: {
            owner: true,
          },
        },
        freelancer: true,
      },
    });

    if (!application) {
      return json({ error: "Application not found" }, { status: 404 });
    }

    // Verify user is project owner
    if (application.project.ownerId !== userId) {
      return json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check user's wallet balance
    const walletBalance = await getUserWalletBalance(userId);
    if (walletBalance < application.proposedBudget) {
      return json({ 
        error: `Insufficient wallet balance. You have LKR ${walletBalance.toLocaleString()} but need LKR ${application.proposedBudget.toLocaleString()}. Please deposit funds to your wallet first.` 
      }, { status: 400 });
    }

    // Create payment record and process wallet payment
    const payment = await createPayment({
      applicationId,
      payerId: userId,
      receiverId: application.freelancerId,
      amount: application.proposedBudget,
    });    // Process wallet-based payment (deduct from payer, add to receiver)
    await transferBetweenWallets(
      userId, // fromUserId (payer)
      application.freelancerId, // toUserId (receiver)
      application.proposedBudget, // amount
      `Payment for project: ${application.project.title}`, // description
      payment.id // referenceId
    );

    // Update payment status to completed since wallet payment is instant
    await prisma.payment.update({
      where: { id: payment.id },
      data: { 
        status: 'HELD_IN_ESCROW',
        paymentMethod: 'WALLET' 
      }
    });

    return json({ 
      success: true, 
      message: `Payment of LKR ${application.proposedBudget.toLocaleString()} successfully processed from your wallet. Funds are held in escrow until project completion.`,
      redirectTo: `/projects/${application.project.id}?payment=success`
    });

  } catch (error) {
    console.error("Payment creation error:", error);
    return json({ error: "Failed to create payment" }, { status: 500 });
  }
}

export default function PaymentPage() {
  const { application, walletBalance } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  // Type guard for success response
  const isSuccessResponse = (data: any): data is { success: boolean; paymentForm: any; checkoutUrl: string } => {
    return data && typeof data === 'object' && 'success' in data;
  };

  // Type guard for error response
  const isErrorResponse = (data: any): data is { error: string } => {
    return data && typeof data === 'object' && 'error' in data;
  };

  // If payment form is ready, auto-submit to PayHere
  if (actionData && isSuccessResponse(actionData) && actionData.success && actionData.paymentForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-center mb-6">Redirecting to Payment...</h2>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Please wait while we redirect you to PayHere...</p>
          </div>
          
          {/* Auto-submit form to PayHere */}
          <form 
            method="POST" 
            action={actionData.checkoutUrl}
            ref={(form) => {
              if (form) {
                setTimeout(() => form.submit(), 1000);
              }
            }}
          >
            {Object.entries(actionData.paymentForm).map(([key, value]) => (
              <input
                key={key}
                type="hidden"
                name={key}
                value={value as string}
              />
            ))}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Make Payment</h1>
          
          {/* Payment Details */}
          <div className="border rounded-lg p-4 mb-6 bg-gray-50">
            <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Project:</span>
                <span className="font-medium">{application.project.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Freelancer:</span>
                <span className="font-medium">{application.freelancer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Amount:</span>
                <span className="font-medium text-green-600">LKR {application.proposedBudget.toFixed(2)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee (5%):</span>
                  <span className="font-medium">LKR {(application.proposedBudget * 0.05).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Freelancer Receives:</span>
                  <span className="font-medium">LKR {(application.proposedBudget * 0.95).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Payment Method</h3>
            <div className="flex items-center space-x-3 p-3 border rounded-lg bg-blue-50">
              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">PayHere</p>
                <p className="text-sm text-gray-600">Secure payment via PayHere Gateway</p>
              </div>
            </div>
          </div>          {/* Error Display */}
          {actionData && isErrorResponse(actionData) && actionData.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-800">{actionData.error}</p>
              </div>
            </div>
          )}

          {/* Payment Form */}
          <Form method="post">
            <div className="flex space-x-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Proceed to Payment
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </Form>

          {/* Security Note */}
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Secure Escrow Payment</p>
                <p className="text-sm text-green-700 mt-1">
                  Your payment will be held in secure escrow until the work is completed and approved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
