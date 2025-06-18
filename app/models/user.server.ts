import { prisma } from '../utils/db.server';

export type User = {
  id: string;
  email: string;
  password: string;
  name: string;
  studentId: string;
  university: string;
  course: string;
  year: number;
  bio?: string;
  skills: string;
  rating: number;
  reviewCount: number;
  walletBalance: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateUserData = {
  email: string;
  password: string;
  name: string;
  studentId: string;
  university: string;
  course: string;
  year: number;
  bio?: string;
  skills: string;
};

export async function createUser(data: CreateUserData) {
  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: data.password, // Ensure to hash the password before saving in a real application
      name: data.name,
      studentId: data.studentId,
      university: data.university,
      course: data.course,
      year: data.year,
      bio: data.bio || '',
      skills: data.skills,
    },
  });
  return user;
}

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });
  return user;
}

export async function getUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  return user;
}

export async function updateUser(userId: string, data: Partial<CreateUserData>) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data,
  });
  return updatedUser;
}

export async function deleteUser(userId: string) {
  await prisma.user.delete({
    where: { id: userId },
  });
}