import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    // Clean up existing data
    await prisma.application.deleteMany();
    await prisma.project.deleteMany();
    await prisma.review.deleteMany();
    await prisma.user.deleteMany();

    // Seed users
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user1 = await prisma.user.create({
        data: {
            name: 'John Doe',
            email: 'john.doe@university.edu',
            password: hashedPassword,
            studentId: '2023001234',
            university: 'University of Technology',
            course: 'Computer Science',
            year: 3,
            skills: JSON.stringify(['Web Development', 'JavaScript', 'React']),
            bio: 'Third-year CS student passionate about web development and creating amazing user experiences.',
        },
    });

    const user2 = await prisma.user.create({
        data: {
            name: 'Jane Smith',
            email: 'jane.smith@university.edu',
            password: hashedPassword,
            studentId: '2023005678',
            university: 'University of Technology',
            course: 'Graphic Design',
            year: 2,
            skills: JSON.stringify(['UI/UX Design', 'Graphic Design', 'Adobe Creative Suite']),
            bio: 'Design student with a passion for creating beautiful and functional designs.',
        },
    });

    // Seed projects
    const project1 = await prisma.project.create({
        data: {
            title: 'Build a Portfolio Website',
            description: 'I need a modern, responsive portfolio website to showcase my photography work. The site should have a clean design, image gallery, contact form, and be mobile-friendly. I have all the content and images ready.',
            budget: 300,
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            skills: JSON.stringify(['Web Development', 'HTML/CSS', 'JavaScript']),
            ownerId: user2.id,
        },
    });

    const project2 = await prisma.project.create({
        data: {
            title: 'Mobile App UI Design',
            description: 'Looking for a talented designer to create UI mockups for a student marketplace mobile app. Need clean, modern designs for about 15 screens including login, browse, chat, and profile screens.',
            budget: 250,
            deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
            skills: JSON.stringify(['UI/UX Design', 'Mobile Design', 'Figma']),
            ownerId: user1.id,
        },
    });

    console.log('Database has been seeded with sample data!');
    console.log('Users created:', { user1: user1.email, user2: user2.email });
    console.log('Projects created:', { project1: project1.title, project2: project2.title });
    console.log('You can login with:');
    console.log('- Email: john.doe@university.edu, Password: password123');
    console.log('- Email: jane.smith@university.edu, Password: password123');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });