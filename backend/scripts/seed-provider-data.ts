import { PrismaClient, VehicleType } from '@prisma/client';

const prisma = new PrismaClient();
const PROVIDER_ID = '696e3ba2f7d80976bc5d9ee9';

async function seedData() {
  try {
    console.log('Seeding professional data for provider...');

    // 1. Create Vehicles
    const vehiclesData = [
      {
        name: 'Platinum Volvo 9600 SHD',
        type: VehicleType.BUS,
        registrationNumber: 'DL 01 EQ 9999',
        totalSeats: 42,
        seatLayout: '2+2',
        amenities: ['AC', 'WiFi', 'Water Bottle', 'Charging Point', 'Blanket', 'Emergency Exit'],
        providerId: PROVIDER_ID,
      },
      {
        name: 'Scania Grand Touring',
        type: VehicleType.BUS,
        registrationNumber: 'HR 38 BX 5555',
        totalSeats: 36,
        seatLayout: '2+1',
        amenities: ['AC', 'Sleeper', 'LED TV', 'WiFi', 'Snacks', 'Pillow'],
        providerId: PROVIDER_ID,
      },
      {
        name: 'Mercedes-Benz Multiaxle',
        type: VehicleType.BUS,
        registrationNumber: 'MH 12 TV 1234',
        totalSeats: 48,
        seatLayout: '2+2',
        amenities: ['AC', 'Reading Light', 'CCTV', 'GPS Tracking', 'Fire Extinguisher'],
        providerId: PROVIDER_ID,
      }
    ];

    const vehicles = [];
    for (const vData of vehiclesData) {
      const v = await prisma.vehicle.upsert({
        where: { registrationNumber: vData.registrationNumber },
        update: vData,
        create: vData,
      });
      vehicles.push(v);
      console.log(`- Vehicle synced: ${v.name} (${v.registrationNumber})`);
    }

    // 2. Create Routes
    const cities = ['Delhi', 'Chandigarh', 'Shimla', 'Lucknow', 'Mumbai', 'Pune', 'Jaipur', 'Dehradun'];
    
    // Helper to get random time
    const times = ['08:00 AM', '10:30 AM', '06:00 PM', '09:00 PM', '11:15 PM'];
    
    const routesData = [
      {
        fromCity: 'Delhi',
        toCity: 'Shimla',
        intermediateStops: ['Chandigarh'],
        price: 1250,
      },
      {
        fromCity: 'Chandigarh',
        toCity: 'Delhi',
        intermediateStops: ['Karnal', 'Panipat'],
        price: 450,
      },
      {
        fromCity: 'Lucknow',
        toCity: 'Delhi',
        intermediateStops: ['Agra (Yamuna Expressway)'],
        price: 950,
      },
      {
        fromCity: 'Delhi',
        toCity: 'Jaipur',
        intermediateStops: ['Gurugram'],
        price: 650,
      },
      {
        fromCity: 'Mumbai',
        toCity: 'Pune',
        intermediateStops: ['Lonavala'],
        price: 550,
      }
    ];

    // Create 10 routes spread over the next few days
    for (let i = 0; i < 10; i++) {
      const vIdx = i % vehicles.length;
      const rIdx = i % routesData.length;
      const vehicle = vehicles[vIdx];
      const routeRef = routesData[rIdx];
      
      const date = new Date();
      date.setDate(date.getDate() + (i % 5)); // Next 5 days
      date.setHours(0, 0, 0, 0);

      await prisma.route.create({
        data: {
          vehicleId: vehicle.id,
          fromCity: routeRef.fromCity,
          toCity: routeRef.toCity,
          intermediateStops: routeRef.intermediateStops,
          date: date,
          departureTime: times[i % times.length],
          price: routeRef.price,
          totalSeats: vehicle.totalSeats,
          availableSeats: vehicle.totalSeats,
          isActive: true
        }
      });
    }

    console.log('Successfully seeded 3 vehicles and 10 dynamic routes.');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedData();
