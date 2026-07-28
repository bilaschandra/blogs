import { MongoClient, type Db } from "mongodb";

const uri = process.env.DATABASE_URL;
if (!uri) {
  throw new Error("DATABASE_URL environment variable is not set");
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  clientPromise = new MongoClient(uri).connect();
}

let indexesEnsured: Promise<void> | undefined;

async function ensureIndexes(db: Db): Promise<void> {
  await db
    .collection("reactions")
    .createIndex({ slug: 1, emoji: 1 }, { unique: true });
}

export async function getDb(): Promise<Db> {
  const client = await clientPromise;
  const db = client.db();

  if (!indexesEnsured) {
    indexesEnsured = ensureIndexes(db);
  }
  await indexesEnsured;

  return db;
}
