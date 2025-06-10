import { db } from '../utils/db.server';

export type Application = {
  id: number;
  userId: number;
  projectId: number;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
};

export async function createApplication(userId: number, projectId: number): Promise<Application> {
  const application = await db.application.create({
    data: {
      userId,
      projectId,
      status: 'pending',
      createdAt: new Date(),
    },
  });
  return application;
}

export async function getApplicationsByUserId(userId: number): Promise<Application[]> {
  const applications = await db.application.findMany({
    where: { userId },
  });
  return applications;
}

export async function getApplicationsByProjectId(projectId: number): Promise<Application[]> {
  const applications = await db.application.findMany({
    where: { projectId },
  });
  return applications;
}

export async function updateApplicationStatus(applicationId: number, status: 'accepted' | 'rejected'): Promise<Application> {
  const application = await db.application.update({
    where: { id: applicationId },
    data: { status },
  });
  return application;
}