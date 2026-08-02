/**
 * One-shot privacy cleanup:
 * - Remove fingerprints/chunks for every non-seed submission
 * - Force addToIndex=false on user papers
 * - Delete leftover files under ./uploads (except nothing seed-related)
 *
 * Run: node scripts/purge-user-index.mjs
 */
import "dotenv/config";
import { readdir, unlink } from "fs/promises";
import path from "path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: url });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const users = await client.query(`
      SELECT id, title, "fileName", "fileUrl"
      FROM "Submission"
      WHERE "fileName" <> 'seed-climate.txt'
    `);

    const ids = users.rows.map((r) => r.id);
    console.log(`Purging index artifacts for ${ids.length} user submissions…`);

    if (ids.length) {
      await client.query(
        `DELETE FROM "DocumentFingerprint" WHERE "submissionId" = ANY($1::text[])`,
        [ids],
      );
      await client.query(
        `DELETE FROM "DocumentChunk" WHERE "submissionId" = ANY($1::text[])`,
        [ids],
      );
      await client.query(
        `UPDATE "Submission"
         SET "addToIndex" = false,
             "fileUrl" = 'deleted://local'
         WHERE id = ANY($1::text[])`,
        [ids],
      );
    }

    await client.query("COMMIT");
    console.log("Database purge complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const uploadsDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR ?? "./uploads");
  try {
    const files = await readdir(uploadsDir);
    for (const file of files) {
      await unlink(path.join(uploadsDir, file));
      console.log("Deleted upload", file);
    }
  } catch {
    console.log("No uploads directory to clear (ok).");
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
