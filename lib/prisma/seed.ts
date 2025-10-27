import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("123456", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin@local.dev" },
    update: {},
    create: { email: "admin@local.dev", password },
  });
  console.log({ user });
}
main().finally(()=>prisma.$disconnect());
