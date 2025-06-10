import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData, Link } from "@remix-run/react";
import { requireUserId, getUserId } from "~/utils/auth.server";
import { db } from "~/utils/db.server";

interface LoaderData {
  project: {
    id: string;
    title: string;
    description: string;
    budget: number;
    deadline: string;
    skills: string[];
    status: string;
    createdAt: string;
    owner: {
      id: string;
      name: string;
      university: string;
      course: string;
      year: number;
      rating: number;
    };
    applications: Array<{
      id: string;
      message: string;
      proposedBudget: number;
      status: string;
      createdAt: string;
      user: {
        id: string;
        name: string;
        university: string;
        course: string;
        year: number;
        rating: number;
      };
    }>;
  };
  currentUserId: string | null;
  userApplication: {
    id: string;
    status: string;
    proposedBudget: number;
  } | null;
}

interface ActionData {
  errors?: {
    message?: string;
    proposedBudget?: string;
  };
  success?: boolean;
}

export const loader: LoaderFunction = async ({ request, params }) => {
  const projectId = params.id;
  if (!projectId) {
    throw new Response("Project not found", { status: 404 });
  }

  const currentUserId = await getUserId(request);

  const project = await db.project.findUnique({
    where: { id: projectId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          university: true,
          course: true,
          year: true,
          rating: true,
        },
      },
      applications: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              university: true,
              course: true,
              year: true,
              rating: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!project) {
    throw new Response("Project not found", { status: 404 });
  }

  const userApplication = currentUserId
    ? await db.application.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: currentUserId,
          },
        },
        select: {
          id: true,
          status: true,
          proposedBudget: true,
        },
      })
    : null;

  return json<LoaderData>({
    project: {
      ...project,
      skills: Array.isArray(project.skills)
        ? project.skills
        : typeof project.skills === "string"
        ? project.skills.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      deadline: project.deadline instanceof Date ? project.deadline.toISOString() : project.deadline,
      createdAt: project.createdAt instanceof Date ? project.createdAt.toISOString() : project.createdAt,
      applications: project.applications.map((application) => ({
        ...application,
        createdAt: application.createdAt instanceof Date ? application.createdAt.toISOString() : application.createdAt,
      })),
    },
    currentUserId,
    userApplication,
  });
};

export const action: ActionFunction = async ({ request, params }) => {
  const userId = await requireUserId(request);
  const projectId = params.id;
  
  if (!projectId) {
    throw new Response("Project not found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "apply") {
    const message = formData.get("message");
    const proposedBudget = formData.get("proposedBudget");

    const errors: ActionData["errors"] = {};

    if (!message || typeof message !== "string") {
      errors.message = "Message is required";
    } else if (message.length < 20) {
      errors.message = "Message must be at least 20 characters";
    }

    if (!proposedBudget || typeof proposedBudget !== "string") {
      errors.proposedBudget = "Proposed budget is required";
    } else if (isNaN(Number(proposedBudget)) || Number(proposedBudget) <= 0) {
      errors.proposedBudget = "Proposed budget must be a positive number";
    }

    if (Object.keys(errors).length > 0) {
      return json<ActionData>({ errors }, { status: 400 });
    }

    // Check if user already applied
    const existingApplication = await db.application.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (existingApplication) {
      return json<ActionData>(
        { errors: { message: "You have already applied to this project" } },
        { status: 400 }
      );
    }

    // Check if user is the project owner
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (project?.ownerId === userId) {
      return json<ActionData>(
        { errors: { message: "You cannot apply to your own project" } },
        { status: 400 }
      );
    }

    await db.application.create({
      data: {
        projectId,
        userId,
        message: message as string,
        proposedBudget: Number(proposedBudget),
      },
    });

    return json<ActionData>({ success: true });
  }

  if (intent === "accept" || intent === "reject") {
    const applicationId = formData.get("applicationId");
    if (!applicationId || typeof applicationId !== "string") {
      throw new Response("Invalid application", { status: 400 });
    }

    // Verify user owns the project
    const application = await db.application.findUnique({
      where: { id: applicationId },
      include: {
        project: {
          select: { ownerId: true },
        },
      },
    });

    if (!application || application.project.ownerId !== userId) {
      throw new Response("Unauthorized", { status: 403 });
    }

    await db.application.update({
      where: { id: applicationId },
      data: {
        status: intent === "accept" ? "ACCEPTED" : "REJECTED",
      },
    });

    if (intent === "accept") {
      // Update project status to IN_PROGRESS
      await db.project.update({
        where: { id: projectId },
        data: { status: "IN_PROGRESS" },
      });
    }

    return redirect(`/projects/${projectId}`);
  }

  throw new Response("Invalid action", { status: 400 });
};

export default function ProjectDetail() {
  const { project, currentUserId, userApplication } = useLoaderData<LoaderData>();
  const actionData = useActionData<ActionData>();

  const isOwner = currentUserId === project.owner.id;
  const canApply = currentUserId && !isOwner && !userApplication && project.status === "OPEN";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.title}</h1>
              <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                <span>Posted by {project.owner.name}</span>
                <span>•</span>
                <span>{project.owner.university}</span>
                <span>•</span>
                <span>{new Date(project.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">${project.budget}</div>
              <div className="text-sm text-gray-500">
                Deadline: {new Date(project.deadline).toLocaleDateString()}
              </div>
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                project.status === 'OPEN' ? 'bg-green-100 text-green-800' :
                project.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                project.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-3">Project Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{project.description}</p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {project.skills.map((skill) => (
                <span
                  key={skill}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Project Owner</h3>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {project.owner.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{project.owner.name}</p>
                <p className="text-sm text-gray-500">
                  {project.owner.course}, Year {project.owner.year}
                </p>
                <p className="text-sm text-gray-500">{project.owner.university}</p>
                <div className="flex items-center">
                  <span className="text-yellow-400">★</span>
                  <span className="text-sm text-gray-600 ml-1">
                    {project.owner.rating.toFixed(1)} rating
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Application Form */}
          {canApply && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Apply for this Project</h3>
              <Form method="post" className="space-y-4">
                <input type="hidden" name="intent" value="apply" />
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                    Cover Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={4}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Explain why you're the right fit for this project..."
                  />
                  <p className="mt-1 text-sm text-gray-500">Minimum 20 characters</p>
                  {actionData?.errors?.message && (
                    <div className="text-red-500 text-sm mt-1">{actionData.errors.message}</div>
                  )}
                </div>

                <div>
                  <label htmlFor="proposedBudget" className="block text-sm font-medium text-gray-700">
                    Your Proposed Budget ($)
                  </label>
                  <input
                    type="number"
                    id="proposedBudget"
                    name="proposedBudget"
                    min="1"
                    step="0.01"
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder={project.budget.toString()}
                  />
                  {actionData?.errors?.proposedBudget && (
                    <div className="text-red-500 text-sm mt-1">{actionData.errors.proposedBudget}</div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
                >
                  Submit Application
                </button>
              </Form>

              {actionData?.success && (
                <div className="mt-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
                  Your application has been submitted successfully!
                </div>
              )}
            </div>
          )}

          {/* User's Application Status */}
          {userApplication && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Your Application</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">
                      Your proposed budget: <span className="font-medium">${userApplication.proposedBudget}</span>
                    </p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    userApplication.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                    userApplication.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {userApplication.status}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Applications (for project owner) */}
          {isOwner && project.applications.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Applications ({project.applications.length})
              </h3>
              <div className="space-y-4">
                {project.applications.map((application) => (
                  <div key={application.id} className="border border-gray-200 rounded-md p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                          <span className="text-white font-semibold">
                            {application.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{application.user.name}</p>
                          <p className="text-sm text-gray-500">
                            {application.user.course}, Year {application.user.year}
                          </p>
                          <p className="text-sm text-gray-500">{application.user.university}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">${application.proposedBudget}</p>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          application.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                          application.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {application.status}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-700 mb-3">{application.message}</p>

                    {application.status === 'PENDING' && project.status === 'OPEN' && (
                      <div className="flex space-x-2">
                        <Form method="post" className="inline">
                          <input type="hidden" name="intent" value="accept" />
                          <input type="hidden" name="applicationId" value={application.id} />
                          <button
                            type="submit"
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Accept
                          </button>
                        </Form>
                        <Form method="post" className="inline">
                          <input type="hidden" name="intent" value="reject" />
                          <input type="hidden" name="applicationId" value={application.id} />
                          <button
                            type="submit"
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Reject
                          </button>
                        </Form>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}