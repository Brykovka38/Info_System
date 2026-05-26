const {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const requiredEnv = [
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

const s3 = new S3Client({
  endpoint: `https://${process.env.B2_ENDPOINT}`,
  region: process.env.B2_REGION,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY,
  },
});

const bucketName = process.env.B2_BUCKET_NAME;
const prefix = "database/";
const retentionDays = 14;

async function cleanupOldBackups() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: prefix,
  });

  const response = await s3.send(listCommand);
  const objects = response.Contents || [];

  if (objects.length === 0) {
    console.log("No backup files found");
    return;
  }

  let deletedCount = 0;

  for (const object of objects) {
    if (!object.Key || !object.LastModified) continue;

    if (object.LastModified < cutoffDate) {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: object.Key,
        })
      );

      console.log(`Deleted old backup: ${object.Key}`);
      deletedCount += 1;
    }
  }

  console.log(`Cleanup completed. Deleted files: ${deletedCount}`);
}

cleanupOldBackups().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});