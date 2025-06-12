import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { useLoaderData, Form, useActionData, useNavigation } from "@remix-run/react";
import { prisma } from "~/utils/db.server";
import { getUserSession } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!user) {
    return redirect("/auth/login");
  }

  return json({ user });
}

export async function action({ request }: ActionFunctionArgs) {
  const session = await getUserSession(request);
  const userId = session.get("userId");

  if (!userId || typeof userId !== "string") {
    return redirect("/auth/login");
  }
  const formData = await request.formData();
  const title = formData.get("title")?.toString();
  const description = formData.get("description")?.toString();
  const budget = formData.get("budget")?.toString();
  const skills = formData.get("skills")?.toString();
  const deadline = formData.get("deadline")?.toString();

  if (!title || !description || !budget || !deadline) {
    return json({ error: "All fields are required" }, { status: 400 });
  }

  try {    const project = await prisma.project.create({
      data: {
        title,
        description,
        budget: parseFloat(budget),
        skills: skills || "",
        deadline: new Date(deadline),
        ownerId: userId,
        status: "OPEN",
      },
    });

    return redirect(`/projects/${project.id}`);
  } catch (error) {
    console.error("Error creating project:", error);
    return json({ error: "Failed to create project" }, { status: 500 });
  }
}

export default function NewProject() {
  const { user } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Post a New Project
          </h1>

          {actionData?.error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{actionData.error}</p>
            </div>
          )}

          <Form method="post" className="space-y-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Project Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your project title"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Project Description
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={6}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe your project in detail..."
              />
            </div>

            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                Budget ($)
              </label>
              <input
                type="number"
                id="budget"
                name="budget"
                required
                min="1"
                step="0.01"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your budget"
              />
            </div>            <div>
              <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                Required Skills (comma-separated)
              </label>
              <input
                type="text"
                id="skills"
                name="skills"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., React, Node.js, Design"
              />
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                Project Deadline
              </label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                required
                min={new Date().toISOString().split('T')[0]}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Creating..." : "Create Project"}
              </button>
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}