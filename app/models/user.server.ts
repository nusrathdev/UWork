import { prisma } from '../utils/db.server';

export async function createUser(data) {
    const { email, password, name } = data;
    const user = await prisma.user.create({
        data: {
            email,
            password, // Ensure to hash the password before saving in a real application
            name,
        },
    });
    return user;
}

export async function getUserById(userId) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
    });
    return user;
}

export async function getUserByEmail(email) {
    const user = await prisma.user.findUnique({
        where: { email },
    });
    return user;
}

export async function updateUser(userId, data) {
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data,
    });
    return updatedUser;
}

export async function deleteUser(userId) {
    await prisma.user.delete({
        where: { id: userId },
    });
}