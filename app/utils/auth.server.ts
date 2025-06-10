import bcrypt from "bcryptjs";
import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { db } from "./db.server";

const sessionSecret = process.env.SESSION_SECRET || "default-secret";

const storage = createCookieSessionStorage({
  cookie: {
    name: "student_freelance_session",
    secure: process.env.NODE_ENV === "production",
    secrets: [sessionSecret],
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
  },
});

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

export async function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("Cookie"));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;
  return userId;
}

export async function requireUserId(request: Request, redirectTo: string = new URL(request.url).pathname) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/auth/login?${searchParams}`);
  }
  return userId;
}

export async function getUser(request: Request) {
  const userId = await getUserId(request);
  if (typeof userId !== "string") {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        studentId: true, 
        university: true, 
        course: true, 
        year: true, 
        skills: true, 
        bio: true, 
        rating: true 
      },
    });
    
    if (user) {
      return {
        ...user,
        skills: JSON.parse(user.skills || "[]")
      };
    }
    return null;
  } catch {
    throw logout(request);
  }
}

export async function logout(request: Request) {
  const session = await getUserSession(request);
  return redirect("/auth/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

export async function createUser(email: string, password: string, userData: any) {
  const hashedPassword = await bcrypt.hash(password, 10);
  return db.user.create({
    data: {
      email,
      password: hashedPassword,
      ...userData,
      skills: JSON.stringify(userData.skills || []),
    },
  });
}

export async function verifyLogin(email: string, password: string) {
  const userWithPassword = await db.user.findUnique({
    where: { email },
  });

  if (!userWithPassword || !await bcrypt.compare(password, userWithPassword.password)) {
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;
  return {
    ...userWithoutPassword,
    skills: JSON.parse(userWithoutPassword.skills || "[]")
  };
}