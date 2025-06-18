import { prisma } from '../utils/db.server';
import type { ProjectStatus } from '@prisma/client';

export type Project = {
  id: string;
  title: string;
  description: string;
  budget: number;
  deadline: Date;
  skills: string;
  status: ProjectStatus;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateProjectData = {
  title: string;
  description: string;
  budget: number;
  deadline: Date;
  skills: string;
  ownerId: string;
};

export async function createProject(project: CreateProjectData) {
  const newProject = await prisma.project.create({
    data: {
      title: project.title,
      description: project.description,
      budget: project.budget,
      deadline: project.deadline,
      skills: project.skills,
      ownerId: project.ownerId,
      status: 'OPEN',
    },
  });
  return newProject;
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      owner: true,
      applications: true,
    },
  });
  return project;
}

export async function getAllProjects() {
  const projects = await prisma.project.findMany({
    include: {
      owner: true,
      applications: true,
    },
  });
  return projects;
}

export async function updateProject(id: string, project: Partial<CreateProjectData>) {
  const updatedProject = await prisma.project.update({
    where: { id },
    data: project,
  });
  return updatedProject;
}

export async function deleteProject(id: string) {
  await prisma.project.delete({
    where: { id },
  });
}