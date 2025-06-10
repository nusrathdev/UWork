import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { requireUserId } from "~/utils/auth.server";
import { db } from "~/utils/db.server";

interface ActionData {
  errors?: {
    title?: string;
    description?: string;
    budget?: string;
    deadline?: string;
    skills?: string;
  };
}

export const loader: LoaderFunction = async ({ request }) => {
  await requireUserId(request);
  return json({});
};

export const action: ActionFunction = async ({ request }) => {
  const userId = await requireUserId(request);
  const formData = await request.formData();
  
  const title = formData.get("title");
  const description = formData.get("description");
  const budget = formData.get("budget");
  const deadline = formData.get("deadline");
  const skillsString = formData.get("skills");

  const errors: ActionData["errors"] = {};

  if (!title || typeof title !== "string") {
    errors.title = "Title is required";
  }

  if (!description || typeof description !== "string") {
    errors.description = "Description is required";
  } else if (description.length < 50) {
    errors.description = "Description must be at least 50 characters";
  }

  if (!budget || typeof budget !== "string") {
    errors.budget = "Budget is required";
  } else if (isNaN(Number(budget)) || Number(budget) <= 0) {
    errors.budget = "Budget must be a positive number";
  }

  if (!deadline || typeof deadline !== "string") {
    errors.deadline = "Deadline is required";
  } else {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deadlineDate <= today) {
      errors.deadline = "Deadline must be in the future";
    }
  }

  if (!skillsString || typeof skillsString !== "string") {
    errors.skills = "At least one skill is required";
  }

  if (Object.keys(errors).length > 0) {
    return json<ActionData>({ errors }, { status: 400 });
  }

  const skills = typeof skillsString === "string"
    ? skillsString.split(",").map((skill: string) => skill.trim()).filter((skill: string) => skill.length > 0)
    : [];

  const project = await db.project.create({
    data: {
      title: title as string,
      description: description as string,
      budget: Number(budget),
      deadline: new Date(deadline as string),
      skills: skills.join(", "),
      ownerId: userId,
    },
  });

  return redirect(`/projects/${project.id}`);
};

export default function NewProject() {
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  const commonSkills = [
    "Web Development",
    "Mobile Development",
    "UI/UX Design",
    "Graphic Design",
    "Content Writing",
    "Data Analysis",
    "Photography",
    "Video Editing",
    "Social Media",
    "Tutoring",
    "Translation",
    "Research",
    "Marketing",
    "Accounting",
    "Programming",
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Post a New Project</h1>
        <p className="mt-2 text-gray-600">
          Describe your project and connect with talented students
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <Form method="post" className="p-6 space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Project Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g., Build a responsive website for my startup"
            />
            {actionData?.errors?.title && (
              <div className="text-red-500 text-sm mt-1">{actionData.errors.title}</div>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Project Description *
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Provide a detailed description of your project, requirements, deliverables, and any specific preferences..."
            />
            <p className="mt-1 text-sm text-gray-500">Minimum 50 characters</p>
            {actionData?.errors?.description && (
              <div className="text-red-500 text-sm mt-1">{actionData.errors.description}</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-gray-700">
                Budget ($) *
              </label>
              <input
                type="number"
                id="budget"
                name="budget"
                min="1"
                step="0.01"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="100"
              />
              {actionData?.errors?.budget && (
                <div className="text-red-500 text-sm mt-1">{actionData.errors.budget}</div>
              )}
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
                Deadline *
              </label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                required
                min={new Date().toISOString().split('T')[0]}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              {actionData?.errors?.deadline && (
                <div className="text-red-500 text-sm mt-1">{actionData.errors.deadline}</div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
              Required Skills *
            </label>
            <input
              type="text"
              id="skills"
              name="skills"
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Web Development, UI/UX Design, JavaScript"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter skills separated by commas
            </p>
            {actionData?.errors?.skills && (
              <div className="text-red-500 text-sm mt-1">{actionData.errors.skills}</div>
            )}

            <div className="mt-2">
              <p className="text-sm font-medium text-gray-700 mb-2">Common Skills:</p>
              <div className="flex flex-wrap gap-2">
                {commonSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => {
                      const skillsInput = document.getElementById("skills") as HTMLInputElement;
                      const currentSkills = skillsInput.value.split(",").map(s => s.trim()).filter(s => s);
                      if (!currentSkills.includes(skill)) {
                        skillsInput.value = currentSkills.length > 0 
                          ? `${currentSkills.join(", ")}, ${skill}`
                          : skill;
                      }
                    }}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full border border-gray-300"
                  >
                    + {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? "Creating..." : "Create Project"}
              </button>
            </div>
          </div>
        </Form>
      </div>
    </div>
  );
}