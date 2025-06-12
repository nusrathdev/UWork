import { redirect } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { logout } from "~/utils/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  console.log("Clear-session action called");
  return logout(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  console.log("Clear-session loader called");
  return logout(request);
}

export default function ClearSession() {
  return (
    <div>
      <p>Logging out...</p>
    </div>
  );
}
