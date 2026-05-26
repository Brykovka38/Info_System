const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const backupPath = process.argv[2];

if (!backupPath) {
  console.error("Укажите путь к файлу резервной копии");
  process.exit(1);
}

if (!fs.existsSync(backupPath)) {
  console.error(`Файл не найден: ${backupPath}`);
  process.exit(1);
}

const requiredEnv = [
  "B2_KEY_ID",
  "B2_APPLICATION_KEY",
  "B2_BUCKET_NAME",
  "B2_ENDPOINT",
  "B2_REGION",
];

for (const name of requiredEnv) {
  if (!process.env[name]) {
    console.error(`Не задана переменная окружения: ${name}`);
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

const fileName = path.basename(backupPath);
const objectKey = `database/${fileName}`;

async function upload() {
  const fileStream = fs.createReadStream(backupPath);

  const command = new PutObjectCommand({
    Bucket: process.env.B2_BUCKET_NAME,
    Key: objectKey,
    Body: fileStream,
    ContentType: "application/octet-stream",
  });

  await s3.send(command);

  console.log(`Backup uploaded to B2: ${objectKey}`);
}

upload().catch((error) => {
  console.error("Ошибка загрузки в Backblaze B2:", error);
  process.exit(1);
});