import { getDb } from "../src/lib/mongodb.ts";
import { hashPassword } from "../src/lib/passwords.ts";

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const match = arg.match(/^--([^=]+)=(.*)$/);
    if (match) args[match[1]] = match[2];
  }
  return args;
}

const { username, password, displayName, role } = parseArgs();

if (!username || !password || !displayName || !role) {
  console.error(
    'Usage: npm run create-admin -- --username=<u> --password=<p> --displayName="<name>" --role=admin|author'
  );
  process.exit(1);
}

if (role !== "admin" && role !== "author") {
  console.error(`Invalid role "${role}" — must be "admin" or "author"`);
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters");
  process.exit(1);
}

const normalizedUsername = username.trim().toLowerCase();

const db = await getDb();
const existing = await db.collection("users").findOne({ username: normalizedUsername });
if (existing) {
  console.error(`Username "${normalizedUsername}" already exists`);
  process.exit(1);
}

const passwordHash = await hashPassword(password);
await db.collection("users").insertOne({
  username: normalizedUsername,
  passwordHash,
  displayName,
  role,
  createdAt: new Date(),
});

console.log(`Created ${role} user "${normalizedUsername}"`);
process.exit(0);
