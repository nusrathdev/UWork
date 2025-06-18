import { prisma } from '../utils/db.server';
import type { ApplicationStatus } from '@prisma/client';

export type Application = {
  id: string;
  projectId: string;
  freelancerId: string;
  coverMessage: string;
  proposedBudget: number;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
};

export async function createApplication(
  freelancerId: string, 
  projectId: string, 
  coverMessage: string, 
  proposedBudget: number
): Promise<Application> {
  const application = await prisma.application.create({
    data: {
      freelancerId,
      projectId,
      coverMessage,
      proposedBudget,
      status: 'PENDING',
    },
  });
  return application;
}

export async function getApplicationsByFreelancerId(freelancerId: string): Promise<Application[]> {
  const applications = await prisma.application.findMany({
    where: { freelancerId },
  });
  return applications;
}

export async function getApplicationsByProjectId(projectId: string): Promise<Application[]> {
  const applications = await prisma.application.findMany({
    where: { projectId },
  });
  return applications;
}

export async function updateApplicationStatus(
  applicationId: string, 
  status: 'APPROVED' | 'REJECTED'
): Promise<Application> {
  const application = await prisma.application.update({
    where: { id: applicationId },
    data: { status },
  });
  return application;
}