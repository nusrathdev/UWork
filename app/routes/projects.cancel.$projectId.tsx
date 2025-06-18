import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useLoaderData, useActionData, Link } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { getUserSession } from "~/utils/auth.server";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const projectId = params.projectId;
  if (!projectId) {
    throw new Error("Project ID is required");
  }

  // Get project with applications
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: true,
      applications: {
        include: {
          freelancer: true
        }
      }
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  // Only project owner can cancel
  if (project.ownerId !== userId) {
    throw new Error("Unauthorized to cancel this project");
  }

  // Can't cancel if already cancelled or completed
  if (project.status === "CANCELLED" || project.status === "COMPLETED") {
    throw new Error("Project cannot be cancelled");
  }

  return json({ project });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const projectId = params.projectId;
  if (!projectId) {
    return json({ error: "Project ID is required" }, { status: 400 });
  }

  try {
    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: true,
        applications: {
          include: {
            freelancer: true
          }
        }
      },
    });

    if (!project) {
      return json({ error: "Project not found" }, { status: 404 });
    }

    // Verify user is project owner
    if (project.ownerId !== userId) {
      return json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if project can be cancelled
    if (project.status === "CANCELLED" || project.status === "COMPLETED") {
      return json({ error: "Project cannot be cancelled" }, { status: 400 });
    }

    // Check if there are approved applications (can't cancel if work started)
    const approvedApplications = project.applications.filter(app => 
      app.status === "APPROVED" || app.status === "PAID" || app.status === "COMPLETED"
    );

    if (approvedApplications.length > 0) {
      return json({ 
        error: "Cannot cancel project with approved applications. Contact support for assistance." 
      }, { status: 400 });
    }

    // Cancel project and refund escrow
    await prisma.$transaction(async (tx) => {
      // Mark project as cancelled
      await tx.project.update({
        where: { id: projectId },
        data: { status: "CANCELLED" }
      });

      // Refund escrow money back to client
      const currentBalance = await tx.user.findUnique({
        where: { id: userId },
        select: { walletBalance: true }
      });

      if (!currentBalance) {
        throw new Error('User not found');
      }

      const newBalance = currentBalance.walletBalance + project.budget;

      await tx.user.update({
        where: { id: userId },
        data: { walletBalance: newBalance }
      });

      // Create refund transaction record
      await tx.walletTransaction.create({
        data: {
          userId: userId,
          type: 'REFUND',
          amount: project.budget,
          currency: 'LKR',
          description: `Refund for cancelled project: ${project.title}`,
          balanceBefore: currentBalance.walletBalance,
          balanceAfter: newBalance,
          payhereOrderId: null,
          paymentData: JSON.stringify({ 
            projectId: project.id,
            type: 'project_cancellation_refund'
          }),
        }
      });

      // Reject all pending applications
      await tx.application.updateMany({
        where: { 
          projectId: projectId,
          status: 'PENDING'
        },
        data: { status: 'REJECTED' }
      });
    });

    console.log(`✅ Project cancelled and refunded: ${project.title} - LKR ${project.budget}`);
    
    return json({ 
      success: true, 
      message: `Project cancelled successfully. LKR ${project.budget.toLocaleString()} has been refunded to your wallet.`
    });

  } catch (error) {
    console.error("Project cancellation error:", error);
    return json({ error: "Failed to cancel project" }, { status: 500 });
  }
}

export default function CancelProjectPage() {
  const { project } = useLoaderData<typeof loader>();
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Project Cancelled Successfully!</h2>
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

  const pendingApplicationsCount = project.applications.filter(app => app.status === 'PENDING').length;
  const approvedApplicationsCount = project.applications.filter(app => 
    app.status === 'APPROVED' || app.status === 'PAID' || app.status === 'COMPLETED'
  ).length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Cancel Project</h1>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Project Cancellation</h3>
            <ul className="text-sm text-yellow-800 space-y-1">
              <li>• Your escrow funds (LKR {project.budget.toLocaleString()}) will be refunded to your wallet</li>
              <li>• All pending applications will be automatically rejected</li>
              <li>• This action cannot be undone</li>
              {approvedApplicationsCount > 0 && (
                <li className="text-red-700 font-medium">• Cannot cancel: Project has approved applications</li>
              )}
            </ul>
          </div>

          {actionData && 'error' in actionData && actionData.error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{actionData.error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Details</h2>
              <div className="bg-gray-50 rounded-md p-4">
                <h3 className="font-medium text-gray-900">{project.title}</h3>
                <p className="text-gray-600 mt-1">{project.description}</p>
                <div className="mt-3 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Budget:</span>
                    <p className="font-medium">LKR {project.budget.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Status:</span>
                    <p className="font-medium">{project.status}</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Applications</h2>
              <div className="bg-gray-50 rounded-md p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Pending Applications:</span>
                    <p className="font-medium">{pendingApplicationsCount}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Approved Applications:</span>
                    <p className="font-medium">{approvedApplicationsCount}</p>
                  </div>
                </div>
              </div>
            </div>

            {approvedApplicationsCount === 0 ? (
              <Form method="post" className="space-y-4">
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Cancel Project & Refund LKR {project.budget.toLocaleString()}
                </button>
              </Form>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800 text-center">
                  Cannot cancel project with approved applications. Contact support for assistance.
                </p>
              </div>
            )}

            <div className="text-center">
              <Link
                to={`/projects/${project.id}`}
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
