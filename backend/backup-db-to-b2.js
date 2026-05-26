const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const requiredEnv = [
  "DATABASE_URL",
  "B2_KEY_ID",
  "B2_APPLICATION_KEY",
  "B2_BUCKET_NAME",
  "B2_ENDPOINT",
  "B2_REGION",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    console.error(`Missing environment variable: ${name}`);
    process.exit(1);
  }
}

const timestamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

const backupDir = path.join(__dirname, "backups");
const backupFile = path.join(backupDir, `backup_${timestamp}.dump`);

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

function runPgDump() {
  return new Promise((resolve, reject) => {
    execFile(
      "pg_dump",
      [
        process.env.DATABASE_URL,
        "-F",
        "c",
        "-f",
        backupFile,
      ],
      (error, stdout, stderr) => {
        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);

        if (error) {
          reject(error);
          return;
        }

        resolve();
      }
    );
  });
}

async function uploadToB2() {
  const s3 = new S3Client({
    endpoint: `https://${process.env.B2_ENDPOINT}`,
    region: process.env.B2_REGION,
    credentials: {
      accessKeyId: process.env.B2_KEY_ID,
      secretAccessKey: process.env.B2_APPLICATION_KEY,
    },
  });

  const fileName = path.basename(backupFile);
  const objectKey = `database/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.B2_BUCKET_NAME,
    Key: objectKey,
    Body: fs.createReadStream(backupFile),
    ContentType: "application/octet-stream",
  });

  await s3.send(command);

  console.log(`Backup uploaded to B2: ${objectKey}`);
}

async function main() {
  try {
    console.log("Starting database backup...");
    await runPgDump();

    console.log(`Backup created: ${backupFile}`);
    await uploadToB2();

    fs.unlinkSync(backupFile);
    console.log("Local backup file removed");
    console.log("Backup completed successfully");
  } catch (error) {
    console.error("Backup failed:", error);
    process.exit(1);
  }
}

main();