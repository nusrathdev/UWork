import { json, redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { verifyLogin } from "~/utils/auth.server";
import { createUserSession, getUserId } from "~/utils/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await getUserId(request);
  if (userId) return redirect("/projects");
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return json(
      { errors: { email: "Email is required", password: "Password is required" } },
      { status: 400 }
    );
  }

  const user = await verifyLogin(email, password);

  if (!user) {
    return json(
      { errors: { email: "Invalid email or password", password: null } },
      { status: 400 }
    );
  }

  return createUserSession(user.id, "/projects");
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.formMethod === "POST";

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">Login</h1>
      <Form method="post" className="w-80">
        <div className="mb-4">
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
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full disabled:opacity-50"
        >
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </Form>
      <p className="mt-4">
        Don't have an account? <Link to="/auth/register" className="text-blue-500">Register here</Link>
      </p>
    </div>
  );
}
