import { prisma } from "../lib/prisma";
import { seedDemoData } from "../lib/demo-data";

async function main() {
  await seedDemoData(false);
  console.log("RuralCare Connect synthetic demo data is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
