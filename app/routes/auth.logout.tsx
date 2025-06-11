import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { logout } from "~/utils/auth.server";

export async function action({ request }: ActionFunctionArgs) {
  console.log("Logout action called");
  return logout(request);
}

export async function loader({ request }: LoaderFunctionArgs) {
  console.log("Logout loader called");
  return logout(request);
}

export default function Logout() {
  return (
    <div>
      <p>Logging out...</p>
    </div>
  );
}
