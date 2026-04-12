// Run this script to add missing indexes for production performance
// Execute: npx ts-node scripts/add-indexes.ts

import { PrismaClient } from 'prisma-client-custom';

const prisma = new PrismaClient();

async function addIndexes() {
  console.log('Adding performance indexes to MongoDB collections...');

  try {
    // Bookings - composite indexes for common queries
    await prisma.$runCommandRaw({
      createIndexes: 'bookings',
      indexes: [
        {
          key: { userId: 1, status: 1, createdAt: -1 },
          name: 'idx_bookings_user_status_created',
        },
        {
          key: { routeId: 1, status: 1, seatNumbers: 1 },
          name: 'idx_bookings_route_status_seats',
        },
        {
          key: { paymentStatus: 1, createdAt: -1 },
          name: 'idx_bookings_payment_created',
        },
      ],
    });
    console.log('✓ Bookings indexes created');

    // Routes - search optimization
    await prisma.$runCommandRaw({
      createIndexes: 'routes',
      indexes: [
        {
          key: { fromCity: 1, toCity: 1, date: 1, isActive: 1, deletedAt: 1 },
          name: 'idx_routes_search',
        },
        {
          key: { vehicleId: 1, date: 1, isActive: 1 },
          name: 'idx_routes_vehicle_date',
        },
        {
          key: { date: 1, availableSeats: 1, isActive: 1 },
          name: 'idx_routes_date_seats',
        },
      ],
    });
    console.log('✓ Routes indexes created');

    // Users - authentication and lookup (skip if exists)
    try {
      await prisma.$runCommandRaw({
        createIndexes: 'users',
        indexes: [
          {
            key: { role: 1, isActive: 1 },
            name: 'idx_users_role_active',
          },
        ],
      });
      console.log('✓ Users indexes created');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✓ Users indexes already exist (skipped)');
      } else {
        throw e;
      }
    }

    // Providers - verification and search (skip if exists)
    try {
      await prisma.$runCommandRaw({
        createIndexes: 'providers',
        indexes: [
          {
            key: { status: 1, rating: -1 },
            name: 'idx_providers_status_rating',
          },
        ],
      });
      console.log('✓ Providers indexes created');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✓ Providers indexes already exist (skipped)');
      } else {
        throw e;
      }
    }

    // Vehicles - provider lookup (skip if exists)
    try {
      await prisma.$runCommandRaw({
        createIndexes: 'vehicles',
        indexes: [
          {
            key: { providerId: 1, isActive: 1, deletedAt: 1 },
            name: 'idx_vehicles_provider_active',
          },
        ],
      });
      console.log('✓ Vehicles indexes created');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✓ Vehicles indexes already exist (skipped)');
      } else {
        throw e;
      }
    }

    // Notifications - user inbox
    await prisma.$runCommandRaw({
      createIndexes: 'notifications',
      indexes: [
        {
          key: { userId: 1, status: 1, createdAt: -1 },
          name: 'idx_notifications_user_status',
        },
        {
          key: { createdAt: -1 },
          name: 'idx_notifications_created',
        },
      ],
    });
    console.log('✓ Notifications indexes created');

    // Promo Codes - validation (skip if exists)
    try {
      await prisma.$runCommandRaw({
        createIndexes: 'promo_codes',
        indexes: [
          {
            key: { status: 1, validFrom: 1, validUntil: 1 },
            name: 'idx_promo_codes_validity',
          },
        ],
      });
      console.log('✓ Promo codes indexes created');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✓ Promo codes indexes already exist (skipped)');
      } else {
        throw e;
      }
    }

    // Wallet Transactions - history
    await prisma.$runCommandRaw({
      createIndexes: 'wallet_transactions',
      indexes: [
        {
          key: { walletId: 1, createdAt: -1 },
          name: 'idx_wallet_txn_wallet_created',
        },
        {
          key: { bookingId: 1 },
          name: 'idx_wallet_txn_booking',
        },
      ],
    });
    console.log('✓ Wallet transactions indexes created');

    // Access Logs - monitoring
    await prisma.$runCommandRaw({
      createIndexes: 'access_logs',
      indexes: [
        {
          key: { createdAt: -1 },
          name: 'idx_access_logs_created',
          expireAfterSeconds: 2592000, // 30 days TTL
        },
        {
          key: { userId: 1, createdAt: -1 },
          name: 'idx_access_logs_user',
        },
      ],
    });
    console.log('✓ Access logs indexes created');

    // API Metrics - performance monitoring
    await prisma.$runCommandRaw({
      createIndexes: 'api_metrics',
      indexes: [
        {
          key: { createdAt: -1 },
          name: 'idx_api_metrics_created',
          expireAfterSeconds: 604800, // 7 days TTL
        },
        {
          key: { url: 1, method: 1, createdAt: -1 },
          name: 'idx_api_metrics_endpoint',
        },
      ],
    });
    console.log('✓ API metrics indexes created');

    console.log('\n✅ All indexes created successfully!');
    console.log('Database is now optimized for production workload.');
  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addIndexes()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
