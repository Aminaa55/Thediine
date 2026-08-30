/**
 * Creates or updates an admin account.
 *
 *   npm run admin:create -- "Name" email@example.com 'the password'
 *
 * The password is hashed here and only the hash is stored. It is never written
 * to the database, the repository or a log in readable form. Run it again with
 * the same email to change the password.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/admin-auth";

const prisma = new PrismaClient();

async function main() {
  const [name, email, password] = process.argv.slice(2);
  if (!name || !email || !password) {
    console.error('Usage: npm run admin:create -- "Name" email@example.com \'password\'');
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("Please use a password of at least 10 characters.");
    process.exit(1);
  }

  const key = email.trim().toLowerCase();
  const existing = await prisma.adminUser.findUnique({ where: { email: key } });

  await prisma.adminUser.upsert({
    where: { email: key },
    update: { name, passwordHash: hashPassword(password), isActive: true },
    create: { name, email: key, passwordHash: hashPassword(password), role: "OWNER" },
  });

  console.log(`\n${existing ? "Updated" : "Created"} the admin account for ${key}.`);
  console.log("Sign in at /admin/login\n");
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
