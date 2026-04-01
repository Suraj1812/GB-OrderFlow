import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaClient, UserRole } from "@prisma/client";

const prisma = new PrismaClient();
const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 12);

async function main() {
  await prisma.exportHistory.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.session.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sku.deleteMany();
  await prisma.dealer.deleteMany();

  const [dealerOne, dealerTwo, dealerThree] = await Promise.all([
    prisma.dealer.create({
      data: {
        code: "GB-D001",
        name: "Dey Pipe Centre",
        region: "Kolkata North",
        contactPerson: "Subhojit Dey",
        phone: "+91 98310 22001",
        email: "dey.pipe@example.com",
        active: true,
      },
    }),
    prisma.dealer.create({
      data: {
        code: "GB-D014",
        name: "Shivam Hardware House",
        region: "Howrah",
        contactPerson: "Rohit Jalan",
        phone: "+91 98310 22014",
        email: "shivam.hw@example.com",
        active: true,
      },
    }),
    prisma.dealer.create({
      data: {
        code: "GB-D032",
        name: "Eastern PVC Point",
        region: "Siliguri",
        contactPerson: "Rajib Sharma",
        phone: "+91 98310 22032",
        email: "eastern.pvc@example.com",
        active: true,
      },
    }),
  ]);

  const passwordHash = await bcrypt.hash("dealer123", saltRounds);
  const adminPasswordHash = await bcrypt.hash("GB@2026!", saltRounds);

  await prisma.user.createMany({
    data: [
      {
        username: "admin",
        displayName: "Dhruv Agarwal",
        email: "pyramidsatpeak@gmail.com",
        passwordHash: adminPasswordHash,
        role: UserRole.HEAD_OFFICE,
        active: true,
      },
      {
        username: dealerOne.code,
        displayName: dealerOne.name,
        dealerId: dealerOne.id,
        email: dealerOne.email,
        passwordHash,
        role: UserRole.DEALER,
        active: true,
      },
      {
        username: dealerTwo.code,
        displayName: dealerTwo.name,
        dealerId: dealerTwo.id,
        email: dealerTwo.email,
        passwordHash,
        role: UserRole.DEALER,
        active: true,
      },
      {
        username: dealerThree.code,
        displayName: dealerThree.name,
        dealerId: dealerThree.id,
        email: dealerThree.email,
        passwordHash,
        role: UserRole.DEALER,
        active: true,
      },
    ],
  });

  await prisma.sku.createMany({
    data: [
      { code: "A004", name: "Supreme PVC Pipe 40mm, 6m", category: "Pipes", uom: "PCS", rate: 631.8, active: true },
      { code: "A018", name: "Supreme PVC Pipe 50mm, 6m", category: "Pipes", uom: "PCS", rate: 884.25, active: true },
      { code: "A032", name: "Supreme PVC Pipe 75mm, 6m", category: "Pipes", uom: "PCS", rate: 1420.5, active: true },
      { code: "B011", name: "Elbow 40mm", category: "Fittings", uom: "PCS", rate: 48.75, active: true },
      { code: "B014", name: "Elbow 50mm", category: "Fittings", uom: "PCS", rate: 72.1, active: true },
      { code: "B063", name: "Tee 75mm", category: "Fittings", uom: "PCS", rate: 118.35, active: true },
      { code: "C020", name: "Solvent Cement 500ml", category: "Chemicals", uom: "TIN", rate: 187.9, active: true },
      { code: "C028", name: "PVC Primer 250ml", category: "Chemicals", uom: "TIN", rate: 119.45, active: true },
      { code: "D102", name: "Ball Valve 1 inch", category: "Valves", uom: "PCS", rate: 246.6, active: true },
      { code: "D118", name: "Ball Valve 1.5 inch", category: "Valves", uom: "PCS", rate: 382.8, active: true },
      { code: "E008", name: "Pipe Clamp 40mm", category: "Accessories", uom: "PCS", rate: 12.55, active: true },
      { code: "E021", name: "Pipe Clamp 75mm", category: "Accessories", uom: "PCS", rate: 24.9, active: true },
      { code: "F015", name: "Thread Seal Tape", category: "Consumables", uom: "PCS", rate: 16.4, active: true },
      { code: "F022", name: "Reducer 75x50mm", category: "Fittings", uom: "PCS", rate: 96.3, active: true },
      { code: "G009", name: "Union 50mm", category: "Fittings", uom: "PCS", rate: 133.55, active: true },
      { code: "H004", name: "SWR Pipe 110mm, 3m", category: "SWR", uom: "PCS", rate: 764.2, active: true },
      { code: "H015", name: "SWR Door Tee 110mm", category: "SWR", uom: "PCS", rate: 182.65, active: true },
      { code: "J020", name: "CPVC Pipe 25mm, 3m", category: "CPVC", uom: "PCS", rate: 212.4, active: true },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
