import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { createUser, validateEmail, validatePassword } from "~/utils/auth.server";
import { createUserSession, getUserId } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (userId) return redirect("/dashboard");
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");
  const name = formData.get("name");
  const university = formData.get("university");
  const studentId = formData.get("studentId");

  if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string" || typeof studentId !== "string") {
    return json(
      { errors: { email: "Email is required", password: "Password is required", name: "Name is required", studentId: "Student ID is required" } },
      { status: 400 }
    );
  }

  const emailError = validateEmail(email);
  if (emailError) {
    return json(
      { errors: { email: emailError, password: null, name: null, studentId: null } },
      { status: 400 }
    );
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return json(
      { errors: { email: null, password: passwordError, name: null, studentId: null } },
      { status: 400 }
    );
  }

  try {
    const user = await createUser(email, password, {
      name,
      studentId,
      university: university || "",
      course: "",
      year: 1,
      skills: [],
      bio: "",
    });

    return createUserSession(user.id, "/dashboard");  } catch (error) {
    return json(
      { errors: { email: "A user with this email already exists", password: null, name: null, studentId: null } },
      { status: 400 }
    );
  }
}

export default function RegisterPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.formMethod === "POST";

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Register</h1>
      <Form method="post" className="w-80">
        <div className="mb-4">
          <label htmlFor="name" className="block mb-2">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            className="border rounded w-full py-2 px-3"
            required
          />
          {actionData?.errors?.name && (
            <p className="text-red-500 text-sm mt-1">{actionData.errors.name}</p>
          )}
        </div>        <div className="mb-4">
          <label htmlFor="email" className="block mb-2">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            className="border rounded w-full py-2 px-3"
            required
          />
          {actionData?.errors?.email && (
            <p className="text-red-500 text-sm mt-1">{actionData.errors.email}</p>
          )}
        </div>
        <div className="mb-4">
          <label htmlFor="studentId" className="block mb-2">Student ID</label>
          <input
            type="text"
            id="studentId"
            name="studentId"
            className="border rounded w-full py-2 px-3"
            required
          />
          {actionData?.errors?.studentId && (
            <p className="text-red-500 text-sm mt-1">{actionData.errors.studentId}</p>
          )}
        </div>
        <div className="mb-4">
          <label htmlFor="university" className="block mb-2">University</label>
          <input
            type="text"
            id="university"
            name="university"
            className="border rounded w-full py-2 px-3"
          />
        </div>
        <div className="mb-4">
          <label htmlFor="password" className="block mb-2">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            className="border rounded w-full py-2 px-3"
            required
          />
          {actionData?.errors?.password && (
            <p className="text-red-500 text-sm mt-1">{actionData.errors.password}</p>
          )}
        </div>
        <button 
          type="submit"
          disabled={isSubmitting}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded w-full disabled:opacity-50"
        >
          {isSubmitting ? "Creating Account..." : "Register"}
        </button>
      </Form>
      <p className="mt-4">
        Already have an account? <Link to="/auth/login" className="text-blue-500">Login here</Link>
      </p>
    </div>
  );
}