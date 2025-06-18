import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useActionData, Link } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { getUserSession } from "~/utils/auth.server";
import { ApplicationStatus } from "@prisma/client";

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
  // Check if application is approved or completed (both can be paid)
  if (application.status !== "APPROVED" && application.status !== "COMPLETED") {
    throw new Error("Application must be approved before payment");
  }

  return json({ application });
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

    // Check if payment already exists
    const existingPayment = await prisma.payment.findFirst({
      where: { applicationId }
    });

    if (existingPayment) {
      return json({ error: "Payment already processed for this application" }, { status: 400 });
    }

    // Release funds from escrow to freelancer (money was already deducted when project was created)
    console.log(`🔄 Releasing escrow funds: LKR ${application.proposedBudget} to ${application.freelancer.name}`);
    
    await prisma.$transaction(async (tx) => {
      // Get current freelancer balance  
      const freelancer = await tx.user.findUnique({
        where: { id: application.freelancerId },
        select: { walletBalance: true }
      });

      if (!freelancer) {
        throw new Error('Freelancer not found');
      }

      const newBalance = freelancer.walletBalance + application.proposedBudget;

      // Add money to freelancer's wallet
      await tx.user.update({
        where: { id: application.freelancerId },
        data: { walletBalance: newBalance }
      });

      // Create transaction record for freelancer
      await tx.walletTransaction.create({
        data: {
          userId: application.freelancerId,
          type: 'PAYMENT_RECEIVED',
          amount: application.proposedBudget,
          currency: 'LKR',
          description: `Payment for project: ${application.project.title}`,
          balanceBefore: freelancer.walletBalance,
          balanceAfter: newBalance,
          payhereOrderId: null,
          paymentData: JSON.stringify({ 
            projectId: application.project.id, 
            applicationId: application.id,
            type: 'escrow_release'
          }),
        }
      });

      // Create payment record
      await tx.payment.create({
        data: {
          orderId: `ESCROW_RELEASE_${Date.now()}`,
          applicationId,
          payerId: userId,
          receiverId: application.freelancerId,
          amount: application.proposedBudget,
          currency: 'LKR',
          status: 'COMPLETED',
          paymentMethod: 'WALLET_ESCROW'
        }
      });

      // Update application status to paid
      await tx.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.COMPLETED }
      });
    });

    console.log(`✅ Escrow payment completed - Released LKR ${application.proposedBudget} to ${application.freelancer.name}`);
    
    return json({ 
      success: true, 
      message: `Payment of LKR ${application.proposedBudget.toLocaleString()} successfully released to ${application.freelancer.name}.`
    });

  } catch (error) {
    console.error("Payment release error:", error);
    return json({ error: "Failed to release payment" }, { status: 500 });
  }
}

export default function PaymentPage() {
  const { application } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  if (actionData && 'success' in actionData && actionData.success) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Released Successfully!</h2>
              <p className="text-gray-600 mb-6">{actionData && 'message' in actionData ? actionData.message : ''}</p>
              <div className="space-y-4">
                <Link 
                  to="/dashboard" 
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Back to Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Release Payment</h1>
          
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">💡 Escrow Release</h3>
            <p className="text-sm text-blue-800">
              The funds for this project were locked in escrow when you posted the job. 
              Clicking "Release Payment" will transfer the money directly to the freelancer's wallet.
            </p>
          </div>          {actionData && 'error' in actionData && actionData.error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{actionData.error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Details</h2>
              <div className="bg-gray-50 rounded-md p-4">
                <h3 className="font-medium text-gray-900">{application.project.title}</h3>
                <p className="text-gray-600 mt-1">{application.project.description}</p>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Details</h2>
              <div className="bg-gray-50 rounded-md p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Freelancer:</span>
                  <span className="font-medium">{application.freelancer.name}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium text-lg">LKR {application.proposedBudget.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Payment Method:</span>
                  <span className="font-medium">Wallet (Escrow Release)</span>
                </div>
              </div>
            </div>

            <Form method="post" className="space-y-4">
              <button
                type="submit"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Release Payment to {application.freelancer.name}
              </button>
            </Form>

            <div className="text-center">
              <Link
                to={`/projects/${application.project.id}`}
                className="text-blue-600 hover:text-blue-500 text-sm"
              >
                Back to Project
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
