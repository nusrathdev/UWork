import type { LinksFunction, LoaderFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";

import { getUser } from "~/utils/auth.server";
import { getUnreadNotificationCount, getUserNotifications } from "~/utils/notifications.server";
import Navigation from "~/components/Navigation";
import stylesheet from "./styles/app.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
];

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  let unreadCount = 0;
  let recentNotifications: any[] = [];
  
  if (user) {
    unreadCount = await getUnreadNotificationCount(user.id);
    recentNotifications = (await getUserNotifications(user.id)).slice(0, 5);
  }
  
  return json({ user, unreadCount, recentNotifications });
};

export default function App() {
  const { user, unreadCount, recentNotifications } = useLoaderData<typeof loader>();

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-50 min-h-screen">
        <Navigation user={user} unreadNotificationCount={unreadCount} recentNotifications={recentNotifications} />
        <main>
          <Outlet />        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
