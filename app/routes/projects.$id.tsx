import type { LoaderFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Link, Form, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { getUserSession } from "~/utils/auth.server";
import { createNotification } from "~/utils/notifications.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  try {
    const session = await getUserSession(request);
    const userId = session.get("userId");

    // Get user data if logged in
    let user = null;
    if (userId && typeof userId === "string") {
      user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
    }

    // Get the project with all related data
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },        applications: {
          include: {
            freelancer: {
              select: {
                id: true,
                name: true,
                email: true,
                rating: true,
              },
            },            chat: {
              include: {
                messages: {
                  select: {
                    id: true,
                    content: true,
                    senderId: true,
                    createdAt: true,
                    sender: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                  orderBy: { createdAt: "asc" },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!project) {
      throw new Response("Project not found", { status: 404 });
    }

    console.log("Project loader - project found:", project.title);

    return json({ project, user });
  } catch (error) {
    console.error("Project detail loader error:", error);
    throw error;
  }
}

export async function action({ params, request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "apply") {
    const coverMessage = formData.get("coverMessage")?.toString();
    const proposedBudget = formData.get("proposedBudget")?.toString();

    if (!coverMessage || !proposedBudget) {
      return json({ error: "Cover message and proposed budget are required" }, { status: 400 });
    }

    try {
      // Check if user already applied
      const existingApplication = await prisma.application.findFirst({
        where: {
          projectId: params.id,
          freelancerId: userId,
        },
      });

      if (existingApplication) {
        return json({ error: "You have already applied to this project" }, { status: 400 });
      }      // Create application
      await prisma.application.create({
        data: {
          projectId: params.id!,
          freelancerId: userId,
          coverMessage,
          proposedBudget: parseFloat(proposedBudget),
          status: "PENDING",
        },
      });

      // Get project owner info to create notification
      const project = await prisma.project.findUnique({
        where: { id: params.id! },
        include: {
          owner: {
            select: { id: true, name: true }
          }
        }
      });

      // Get freelancer info for notification
      const freelancer = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });

      // Create notification for project owner
      if (project && freelancer) {
        await createNotification({
          userId: project.owner.id,
          type: "PROJECT_UPDATE",
          title: "New Application Received!",
          message: `${freelancer.name} applied to your project "${project.title}". Review their application now.`,
          data: {
            projectId: params.id,
            projectTitle: project.title,
            freelancerName: freelancer.name
          }
        });
      }return json({ success: "Application submitted successfully!" });
    } catch (error) {
      console.error("Error creating application:", error);
      return json({ error: "Failed to submit application" }, { status: 500 });
    }
  }
  if (intent === "approve" || intent === "reject") {
    const applicationId = formData.get("applicationId")?.toString();
    
    if (!applicationId) {
      return json({ error: "Application ID is required" }, { status: 400 });
    }

    try {
      // Check if user is the project owner
      const project = await prisma.project.findUnique({
        where: { id: params.id },
        select: { ownerId: true },
      });

      if (!project || project.ownerId !== userId) {
        return json({ error: "You are not authorized to perform this action" }, { status: 403 });
      }      // Update application status
      const updatedApplication = await prisma.application.update({
        where: { id: applicationId },
        data: { status: intent === "approve" ? "APPROVED" : "REJECTED" },
        include: {
          freelancer: {
            select: { id: true, name: true }
          },
          project: {
            select: { title: true }
          }
        },
      });

      // Create notification for the freelancer
      const isApproved = intent === "approve";
      await createNotification({
        userId: updatedApplication.freelancer.id,
        type: isApproved ? "APPLICATION_APPROVED" : "APPLICATION_REJECTED",
        title: isApproved ? "Application Approved!" : "Application Update",
        message: isApproved 
          ? `Your application for "${updatedApplication.project.title}" has been approved! You can now start chatting.`
          : `Your application for "${updatedApplication.project.title}" was not accepted this time.`,
        data: {
          applicationId: applicationId,
          projectId: params.id,
          projectTitle: updatedApplication.project.title
        }
      });

      // If approved, create a chat for the application
      if (intent === "approve") {
        await prisma.chat.create({
          data: {
            applicationId: applicationId,
          },
        });
      }

      // Redirect back to the same page to refresh data and show the success message
      const url = new URL(request.url);
      url.searchParams.set('success', intent === "approve" ? 'approved' : 'rejected');
      
      return redirect(url.toString());
    } catch (error) {
      console.error("Error updating application:", error);
      return json({ error: "Failed to update application" }, { status: 500 });
    }
  }


  return json({ error: "Invalid action" }, { status: 400 });
}

export default function ProjectDetail() {
  const { project, user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const isSubmitting = navigation.state === "submitting";

  // Get success message from URL parameters
  const successParam = searchParams.get('success');
  const successMessage = successParam === 'approved' 
    ? "Application approved! You can now chat with the freelancer."
    : successParam === 'rejected'
    ? "Application rejected successfully."
    : null;
  // Check if current user is the project owner
  const isOwner = user && user.id === project.owner.id;

  // Check if current user has already applied and get their application
  const userApplication = user ? project.applications.find(app => app.freelancer.id === user.id) : null;
  const hasApplied = !!userApplication;
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Project Header */}          <div className="border-b border-gray-200 pb-6 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {project.title}
                </h1>
                <p className="text-lg font-semibold text-green-600">
                  Budget: ${project.budget}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Posted by: {project.owner.name}
                </p>
                <p className="text-sm text-gray-500">
                  Deadline: {new Date(project.deadline).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <div className="flex flex-col items-end space-y-2">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    project.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                    project.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                    project.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                  <p className="text-sm text-gray-500">
                    {project.applications.length} applications
                  </p>
                  {user && !isOwner && (
                    <button
                      onClick={() => window.location.reload()}
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                    >
                      🔄 Check for Updates
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Project Description */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
            </div>
          </div>

          {/* Skills Required */}
          {project.skills && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills Required</h2>              <div className="flex flex-wrap gap-2">
                {(() => {
                  try {
                    // Try to parse as JSON array first
                    const skills = JSON.parse(project.skills);
                    return skills.map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {skill.trim()}
                      </span>
                    ));
                  } catch {
                    // Fallback to comma-separated string
                    return project.skills.split(',').map((skill, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {skill.trim()}
                      </span>
                    ));
                  }
                })()}
              </div>
            </div>
          )}          {/* Action Messages */}
          {actionData && "error" in actionData && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{actionData.error}</p>
            </div>
          )}

          {((actionData && "success" in actionData) || successMessage) && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-800">
                {successMessage || (actionData as any)?.success}
              </p>
            </div>
          )}

          {/* Application Form or Status */}
          {user ? (
            isOwner ? (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">This is your project</h3>
                <p className="text-blue-700 mb-4">You can manage applications and project status.</p>
                <Link
                  to={`/dashboard/projects/${project.id}/manage`}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Manage Project
                </Link>
              </div>            ) : hasApplied ? (
              <div className={`border rounded-md p-6 ${
                userApplication?.status === 'APPROVED' ? 'bg-green-50 border-green-200' :
                userApplication?.status === 'REJECTED' ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-2 ${
                  userApplication?.status === 'APPROVED' ? 'text-green-900' :
                  userApplication?.status === 'REJECTED' ? 'text-red-900' :
                  'text-yellow-900'
                }`}>
                  Application Status: {userApplication?.status || 'PENDING'}
                </h3>
                
                {userApplication?.status === 'APPROVED' ? (
                  <div>
                    <p className="text-green-700 mb-4">
                      🎉 Congratulations! Your application has been approved. You can now start chatting with the project owner.
                    </p>
                    <div className="flex space-x-3">
                      <Link
                        to={`/chat/${userApplication.id}`}
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                        </svg>
                        Start Chat
                      </Link>
                      <Link
                        to="/dashboard"
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Go to Dashboard
                      </Link>
                    </div>
                  </div>
                ) : userApplication?.status === 'REJECTED' ? (
                  <div>
                    <p className="text-red-700 mb-4">
                      Unfortunately, your application was not accepted for this project. Don't give up - there are many other opportunities available!
                    </p>
                    <Link
                      to="/projects"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Browse Other Projects
                    </Link>
                  </div>
                ) : (
                  <div>
                    <p className="text-yellow-700 mb-4">
                      Your application is under review. Please wait for the project owner to review your application.
                    </p>
                    <div className="text-sm text-gray-600 mt-2">
                      <p><strong>Your Proposal:</strong> ${userApplication?.proposedBudget}</p>
                      <p><strong>Applied:</strong> {userApplication?.createdAt ? new Date(userApplication.createdAt).toLocaleDateString() : 'Unknown'}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : project.status === 'OPEN' ? (
              <div className="bg-white border border-gray-200 rounded-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Apply for this Project</h3>
                <Form method="post" className="space-y-4">
                  <input type="hidden" name="intent" value="apply" />
                  
                  <div>
                    <label htmlFor="coverMessage" className="block text-sm font-medium text-gray-700 mb-1">
                      Cover Message
                    </label>
                    <textarea
                      id="coverMessage"
                      name="coverMessage"
                      required
                      rows={4}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Tell the project owner why you're the right person for this job..."
                    />
                  </div>

                  <div>
                    <label htmlFor="proposedBudget" className="block text-sm font-medium text-gray-700 mb-1">
                      Your Proposed Budget ($)
                    </label>
                    <input
                      type="number"
                      id="proposedBudget"
                      name="proposedBudget"
                      required
                      min="1"
                      step="0.01"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your budget"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Application"}
                  </button>
                </Form>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Project Not Available</h3>
                <p className="text-gray-700">This project is no longer accepting applications.</p>
              </div>
            )
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Login Required</h3>
              <p className="text-gray-700 mb-4">Please log in to apply for this project.</p>
              <Link
                to="/auth/login"
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Login
              </Link>
            </div>
          )}

          {/* Applications (for project owner) */}
          {isOwner && project.applications.length > 0 && (
            <div className="mt-8 border-t border-gray-200 pt-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Applications ({project.applications.length})</h2>
              <div className="space-y-4">                {project.applications.map((application) => (
                  <div key={application.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{application.freelancer.name}</h4>
                        <p className="text-sm text-gray-600">{application.freelancer.email}</p>
                        <p className="text-sm text-gray-500">
                          ★ {application.freelancer.rating?.toFixed(1) || '0.0'} rating
                        </p>
                        <p className="text-sm font-medium text-green-600 mt-1">
                          Proposed Budget: ${application.proposedBudget}
                        </p>
                        <p className="text-gray-700 mt-2">{application.coverMessage}</p>
                      </div>
                      <div className="ml-4 flex flex-col items-end space-y-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          application.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                          application.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {application.status}
                        </span>                        <p className="text-xs text-gray-500">
                          Applied: {new Date(application.createdAt).toLocaleDateString()}
                          {application.updatedAt && application.updatedAt !== application.createdAt && (
                            <span className="block">
                              Updated: {new Date(application.updatedAt).toLocaleDateString()} at {new Date(application.updatedAt).toLocaleTimeString()}
                            </span>
                          )}
                        </p>
                        
                        {/* Action buttons for pending applications */}
                        {application.status === 'PENDING' && (
                          <div className="flex space-x-2 mt-2">
                            <Form method="post" className="inline">
                              <input type="hidden" name="intent" value="approve" />
                              <input type="hidden" name="applicationId" value={application.id} />
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:opacity-50"
                              >
                                Accept
                              </button>
                            </Form>
                            <Form method="post" className="inline">
                              <input type="hidden" name="intent" value="reject" />
                              <input type="hidden" name="applicationId" value={application.id} />
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 disabled:opacity-50"
                              >
                                Reject
                              </button>
                            </Form>
                          </div>
                        )}                        {/* Chat button for approved applications */}
                        {application.status === 'APPROVED' && (
                          <Link
                            to={`/chat/${application.id}`}
                            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-xs"
                          >
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                            </svg>
                            Chat
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}          {/* Back to Projects */}          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link
              to="/projects"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Projects
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}