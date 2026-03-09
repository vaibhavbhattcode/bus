/**
 * Simple script to create an admin user (JavaScript version)
 * 
 * Usage:
 *   node scripts/create-admin-simple.js
 * 
 * Edit the user details below before running
 */

const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ============================================
// EDIT THESE VALUES
// ============================================
const ADMIN_DETAILS = {
  name: 'Admin User',
  email: 'admin@example.com',
  phone: '1234567890',
  password: 'admin123', // Change this!
};

// ============================================

async function createAdmin() {
  try {
    console.log('\n=== Creating Admin User ===\n');

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: ADMIN_DETAILS.email },
          { phone: ADMIN_DETAILS.phone },
        ],
      },
    });

    if (existingUser) {
      console.error('❌ User with this email or phone already exists!');
      console.error('   Email:', existingUser.email);
      console.error('   Phone:', existingUser.phone);
      console.error('   Role:', existingUser.role);
      process.exit(1);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(ADMIN_DETAILS.password, 10);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        name: ADMIN_DETAILS.name,
        email: ADMIN_DETAILS.email,
        phone: ADMIN_DETAILS.phone,
        password: hashedPassword,
        role: UserRole.ADMIN,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
    });

    console.log('✅ Admin user created successfully!\n');
    console.log('User Details:');
    console.log(`  ID: ${admin.id}`);
    console.log(`  Name: ${admin.name}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Phone: ${admin.phone}`);
    console.log(`  Role: ${admin.role}`);
    console.log(`  Created: ${admin.createdAt}`);
    console.log('\n📝 You can now login with these credentials at /login\n');
  } catch (error) {
    console.error('\n❌ Error creating admin user:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
