import { db } from '../utils/db.server';

export type Project = {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
};

export async function createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) {
  const newProject = await db.project.create({
    data: {
      ...project,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  return newProject;
}

export async function getProjectById(id: string) {
  const project = await db.project.findUnique({
    where: { id },
  });
  return project;
}

export async function getAllProjects() {
  const projects = await db.project.findMany();
  return projects;
}

export async function updateProject(id: string, project: Partial<Omit<Project, 'id' | 'createdAt'>>) {
  const updatedProject = await db.project.update({
    where: { id },
    data: {
      ...project,
      updatedAt: new Date(),
    },
  });
  return updatedProject;
}

export async function deleteProject(id: string) {
  await db.project.delete({
    where: { id },
  });
}