// models/s3bucket.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY!,
  },
});

export const uploadFileToS3Bucket = async (file: {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
}) => {
  const fileExtension = path.extname(file.originalname);
  const randomName = crypto.randomBytes(16).toString("hex");
  const key = `uploads/${randomName}${fileExtension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: "public-read",
    })
  );

  return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
};
