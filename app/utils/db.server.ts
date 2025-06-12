import { PrismaClient } from '@prisma/client';

let db: PrismaClient;

declare global {
  var __db__: PrismaClient | undefined;
}

if (process.env.NODE_ENV === 'production') {
  db = new PrismaClient();
} else {
  if (!global.__db__) {
    global.__db__ = new PrismaClient();
  }
  db = global.__db__;
}

export { db };
export const prisma = db;

export const getUsers = async () => {
  return await db.user.findMany();
};

export const getUserById = async (id: string) => {
  return await db.user.findUnique({
    where: { id },
  });
};

export const createUser = async (data: { email: string; name: string; password: string; studentId: string; university: string; course: string; year: number; skills: string[] }) => {
  return await db.user.create({
    data: {
      ...data,
      skills: data.skills.join(','),
    },
  });
};

export const getProjects = async () => {
  return await db.project.findMany();
};

export const getProjectById = async (id: string) => {
  return await db.project.findUnique({
    where: { id },
  });
};

export const createProject = async (data: { title: string; description: string; userId: string; budget: number; deadline: Date; skills: string[] }) => {
  return await db.project.create({
    data: {
      title: data.title,
      description: data.description,
      budget: data.budget,
      deadline: data.deadline,
      skills: data.skills.join(','), // or keep as array if your schema supports it
      owner: { connect: { id: data.userId } }
    },
  });
};

export const updateProject = async (id: string, data: { title?: string; description?: string }) => {
  return await db.project.update({
    where: { id },
    data,
  });
};

export const deleteProject = async (id: string) => {
  return await db.project.delete({
    where: { id },
  });
};