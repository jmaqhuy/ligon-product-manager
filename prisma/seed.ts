import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create boss account
  const bossPassword = await hash("ligon2024", 12);
  const boss = await prisma.user.upsert({
    where: { email: "boss@ligonteam.com" },
    update: {},
    create: {
      email: "boss@ligonteam.com",
      passwordHash: bossPassword,
      fullName: "Ligon Boss",
      nameAbbreviation: "LB",
      role: "boss",
      status: "active",
    },
  });
  console.log(`✅ Boss account: ${boss.email}`);

  // Create a manager account
  const managerPassword = await hash("ligon2024", 12);
  const manager = await prisma.user.upsert({
    where: { email: "manager@ligonteam.com" },
    update: {},
    create: {
      email: "manager@ligonteam.com",
      passwordHash: managerPassword,
      fullName: "Nguyễn Quốc Huy",
      nameAbbreviation: "NQH",
      role: "manager",
      status: "active",
    },
  });
  console.log(`✅ Manager account: ${manager.email}`);

  // Create an employee account
  const employeePassword = await hash("ligon2024", 12);
  const employee = await prisma.user.upsert({
    where: { email: "employee@ligonteam.com" },
    update: {},
    create: {
      email: "employee@ligonteam.com",
      passwordHash: employeePassword,
      fullName: "Trần Minh Ánh",
      nameAbbreviation: "TMA",
      role: "employee",
      status: "active",
    },
  });
  console.log(`✅ Employee account: ${employee.email}`);

  // Create sample product topics
  const topics = [
    "Baby Announcement Sign",
    "Baby Milestone Sign",
    "Christmas Ornament",
    "Wedding Sign",
    "Pet Memorial",
    "Home Decor",
  ];
  for (const name of topics) {
    await prisma.productTopic.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅ Created ${topics.length} product topics`);

  // Create sample AI models
  const aiModels = [
    "Midjourney V6",
    "DALL-E 3",
    "Stable Diffusion XL",
    "Flux Pro",
    "Leonardo AI",
  ];
  for (const name of aiModels) {
    await prisma.aiModel.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅ Created ${aiModels.length} AI models`);

  // Create sample selling accounts
  await prisma.sellingAccount.upsert({
    where: { id: "amz-main" },
    update: {},
    create: {
      id: "amz-main",
      platform: "amazon",
      name: "Ligon Amazon Main",
      status: "active",
      createdById: boss.id,
    },
  });

  await prisma.sellingAccount.upsert({
    where: { id: "etsy-main" },
    update: {},
    create: {
      id: "etsy-main",
      platform: "etsy",
      name: "Ligon Etsy Store",
      status: "active",
      createdById: boss.id,
    },
  });
  console.log("✅ Created selling accounts");

  // Create sample workers (for production dropdown)
  const workers = ["Anh Tuấn", "Chị Linh", "Anh Đức", "Chị Hoa"];
  for (const name of workers) {
    await prisma.worker.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✅ Created ${workers.length} workers`);

  console.log("\n🎉 Seed completed!");
  console.log("Login credentials:");
  console.log("  Boss: boss@ligonteam.com / ligon2024");
  console.log("  Manager: manager@ligonteam.com / ligon2024");
  console.log("  Employee: employee@ligonteam.com / ligon2024");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
