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
      name: userData.name,
      studentId: userData.studentId,
      university: userData.university,
      course: userData.course || '',
      year: userData.year || 1,
      bio: userData.bio || '',
      skills: Array.isArray(userData.skills) ? userData.skills.join(',') : (userData.skills || ''),
    },
  });
}

export function validateEmail(email: string): string | null {
  if (!email) return "Email is required";
  if (typeof email !== "string") return "Email must be a string";
  if (email.length < 3) return "Email must be at least 3 characters long";
  if (!email.includes("@")) return "Email must be a valid email address";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required";
  if (typeof password !== "string") return "Password must be a string";
  if (password.length < 6) return "Password must be at least 6 characters long";
  return null;
}

export async function verifyLogin(email: string, password: string) {
  console.log("verifyLogin called with email:", email);
  
  const userWithPassword = await db.user.findUnique({
    where: { email },
  });

  console.log("User found in database:", !!userWithPassword);

  if (!userWithPassword) {
    console.log("No user found with email:", email);
    return null;
  }

  const passwordMatch = await bcrypt.compare(password, userWithPassword.password);
  console.log("Password match:", passwordMatch);

  if (!passwordMatch) {
    console.log("Password does not match for user:", email);
    return null;
  }

  const { password: _password, ...userWithoutPassword } = userWithPassword;
  return {
    ...userWithoutPassword,
    skills: JSON.parse(userWithoutPassword.skills || "[]")
  };
}