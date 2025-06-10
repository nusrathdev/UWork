import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData } from "@remix-run/react";
import { createUser, createUserSession, getUserId } from "~/utils/auth.server";
import { db } from "~/utils/db.server";

interface ActionData {
  errors?: {
    email?: string;
    password?: string;
    name?: string;
    studentId?: string;
    university?: string;
    course?: string;
    year?: string;
  };
}

export const loader: LoaderFunction = async ({ request }) => {
  const userId = await getUserId(request);
  if (userId) return redirect("/dashboard");
  return json({});
};

export const action: ActionFunction = async ({ request }) => {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const name = formData.get("name");
  const studentId = formData.get("studentId");
  const university = formData.get("university");
  const course = formData.get("course");
  const year = formData.get("year");

  const errors: ActionData["errors"] = {};

  if (!email || typeof email !== "string") {
    errors.email = "Email is required";
  } else if (!email.includes("@")) {
    errors.email = "Please enter a valid email";
  }

  if (!password || typeof password !== "string") {
    errors.password = "Password is required";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (!name || typeof name !== "string") {
    errors.name = "Name is required";
  }

  if (!studentId || typeof studentId !== "string") {
    errors.studentId = "Student ID is required";
  }

  if (!university || typeof university !== "string") {
    errors.university = "University is required";
  }

  if (!course || typeof course !== "string") {
    errors.course = "Course is required";
  }

  if (!year || typeof year !== "string") {
    errors.year = "Year is required";
  }

  if (Object.keys(errors).length > 0) {
    return json<ActionData>({ errors }, { status: 400 });
  }

  // Check if user already exists
  const existingUser = await db.user.findFirst({
    where: {
      OR: [
        { email: email as string },
        { studentId: studentId as string }
      ]
    }
  });

  if (existingUser) {
    return json<ActionData>(
      { errors: { email: "A user with this email or student ID already exists" } },
      { status: 400 }
    );
  }

  const user = await createUser(email as string, password as string, {
    name: name as string,
    studentId: studentId as string,
    university: university as string,
    course: course as string,
    year: parseInt(year as string),
    skills: [],
  });

  return createUserSession(user.id, "/dashboard");
};

export default function Register() {
  const actionData = useActionData<ActionData>();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{" "}
            <Link
              to="/auth/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              sign in to your existing account
            </Link>
          </p>
        </div>
        <Form method="post" className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="John Doe"
              />
              {actionData?.errors?.name && (
                <div className="text-red-500 text-sm mt-1">{actionData.errors.name}</div>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="john.doe@university.edu"
              />
              {actionData?.errors?.email && (
                <div className="text-red-500 text-sm mt-1">{actionData.errors.email}</div>
              )}
            </div>

            <div>
              <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">
                Student ID
              </label>
              <input
                id="studentId"
                name="studentId"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="2023001234"
              />
              {actionData?.errors?.studentId && (
                <div className="text-red-500 text-sm mt-1">{actionData.errors.studentId}</div>
              )}
            </div>

            <div>
              <label htmlFor="university" className="block text-sm font-medium text-gray-700">
                University
              </label>
              <input
                id="university"
                name="university"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="University of Technology"
              />
              {actionData?.errors?.university && (
                <div className="text-red-500 text-sm mt-1">{actionData.errors.university}</div>
              )}
            </div>

            <div>
              <label htmlFor="course" className="block text-sm font-medium text-gray-700">
                Course/Major
              </label>
              <input
                id="course"
                name="course"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Computer Science"
              />
              {actionData?.errors?.course && (
                <div className="text-red-500 text-sm mt-1">{actionData.errors.course}</div>
              )}
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                Year of Study
              </label>
              <select
                id="year"
                name="year"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select year</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
                <option value="5">5th Year</option>
                <option value="6">Graduate</option>
              </select>
              {actionData?.errors?.year && (
                <div className="text-red-500 text-sm mt-1">{actionData.errors.year}</div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="At least 6 characters"
              />
              {actionData?.errors?.password && (
                <div className="text-red-500 text-sm mt-1">{actionData.errors.password}</div>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Account
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}