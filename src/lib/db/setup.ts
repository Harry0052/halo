import { databasePath, getSqlite } from "./client";

getSqlite();
console.log(`Halo database is migrated at ${databasePath()}`);
