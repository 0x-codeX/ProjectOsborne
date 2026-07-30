const {
  S3Client,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");


// STRESS TEST: Check if the keys actually exist before building the client
if (!process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
  console.error("FATAL ERROR: S3 credentials are missing from the backend .env file!");
}

// Initialize the client pointed at Cloudflare R2
const r2Client =
  new S3Client(
    {
      region:
        "auto",
      endpoint: `https://${process.env.S3_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials:
        {
          accessKeyId:
            process
              .env
              .S3_ACCESS_KEY,
          secretAccessKey:
            process
              .env
              .S3_SECRET_KEY,
        },
    },
  );

exports.deleteFromCloudflare =
  async (
    fileKey,
  ) => {
    try {
      const command =
        new DeleteObjectCommand(
          {
            Bucket:
              process
                .env
                .S3_BUCKET_NAME,
            Key: fileKey, // This is the exact filename string saved in your MongoDB
          },
        );

      await r2Client.send(
        command,
      );
      console.log(
        `[Cloudflare R2] Successfully vaporized: ${fileKey}`,
      );
      return true;
    } catch (error) {
      console.error(
        `[Cloudflare R2] Delete Error for ${fileKey}:`,
        error,
      );
      // We throw the error so the Reaper cron job catches it and knows
      // NOT to delete the database record.
      throw error;
    }
  };
