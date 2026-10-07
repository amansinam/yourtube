import "dotenv/config";
import mongoose from "mongoose";

const confirmed = process.argv.includes("--confirm");

if (!process.env.DB_URL) {
  throw new Error("DB_URL is missing from the environment.");
}

await mongoose.connect(process.env.DB_URL);

try {
  const database = mongoose.connection.db;
  const collections = await database.listCollections().toArray();
  const counts = await Promise.all(
    collections.map(async ({ name }) => [name, await database.collection(name).countDocuments()]),
  );

  console.log(`Target database: ${mongoose.connection.name}`);
  console.log("Existing documents:");
  for (const [name, count] of counts) console.log(`- ${name}: ${count}`);

  if (!confirmed) {
    console.log("Dry run only. Run `npm run reset:database -- --confirm` to permanently delete all documents.");
    process.exitCode = 1;
  } else {
    await Promise.all(collections.map(({ name }) => database.collection(name).deleteMany({})));
    console.log("All documents have been deleted. Collections are retained and the database is now empty.");
  }
} finally {
  await mongoose.disconnect();
}
