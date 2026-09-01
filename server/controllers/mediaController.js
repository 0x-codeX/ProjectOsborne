const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const {
  getSignedUrl,
} = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");
const Content = require("../models/Content");
const Purchase = require("../models/Purchase");


// Initialize the S3 Client (Requires environment variables)
const s3Client =
  new S3Client(
    {
      region:
        process
          .env
          .S3_REGION ||
        "auto",
      endpoint:
        process
          .env
          .S3_ENDPOINT, // <--- THIS IS MANDATORY FOR CLOUDFLARE R2
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


  // @desc    Generate a Pre-signed S3 Upload URL
// @route   POST /api/media/upload-ticket
exports.generateUploadTicket = async (req, res) => {
  try {
    const { fileName, fileType } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ message: "File name and type are required" });
    }

    // 1. Generate a secure, randomized file key
    const fileExtension = fileName.split(".").pop();
    const secureFileName = `${req.user._id}/${crypto.randomBytes(16).toString("hex")}.${fileExtension}`;

    // 2. Define the exact parameters
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: secureFileName,
      ContentType: fileType,
    });

    // 3. Generate a temporary URL that expires in exactly 15 minutes (900 seconds)
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    // 4. Construct the final public URL based on your R2 domain
    const publicUrl = `https://${process.env.R2_PUBLIC_DOMAIN}/${secureFileName}`;

    // Return the ticket and the final file path to the frontend
    res.status(200).json({
      uploadUrl,
      fileKey: secureFileName,
      publicUrl, // <--- ADDED: Frontend needs this to save to the profile
      message: "Ticket valid for 15 minutes.",
    });
  } catch (error) {
    console.error("Presigned URL Error:", error);
    res.status(500).json({ message: "Failed to generate upload ticket." });
  }
};

// GET /api/media/stream/:contentId
exports.getSecureStreamUrl = async (req, res) => {
    try {
      const {
        contentId,
      } =
        req.params;
      const viewerId =
        req
          .user
          ._id;

      // 1. Fetch the Content
      const content =
        await Content.findById(
          contentId,
        ).populate(
          "creator",
        );
      if (
        !content
      )
        return res
          .status(
            404,
          )
          .json(
            {
              message:
                "Content not found.",
            },
          );

      // 2. Perform the Zero-Trust Validation Check
      const globalPPV =
        content
          .creator
          .monetizationSettings
          ?.defaultPPVPrice ||
        0;
      const actualPrice =
        content.price !==
        null
          ? content.price
          : globalPPV;

      const isCreator =
        content.creator._id.toString() ===
        viewerId.toString();
      const isFree =
        actualPrice ===
        0;

      // --- WEB2 CHECK (FIAT/STRIPE) ---
      const validPurchase =
        await Purchase.findOne(
          {
            user: viewerId,
            $or: [
              {
                content:
                  contentId,
                purchaseType:
                  "PPV",
              },
              {
                creator:
                  content
                    .creator
                    ._id,
                purchaseType:
                  "SUBSCRIPTION",
                expiresAt:
                  {
                    $gt: new Date(),
                  },
                status:
                  "completed",
              },
            ],
          },
        );

      // --- WEB3 CHECK (CRYPTO/POLYGON) ---
      const viewerWallet =
        req
          .user
          .walletAddress
          ? req.user.walletAddress.toLowerCase()
          : null;
      let hasPurchasedCrypto = false;
      if (
        viewerWallet &&
        content.unlockedFor &&
        content
          .unlockedFor
          .length >
          0
      ) {
        hasPurchasedCrypto =
          content.unlockedFor.some(
            (
              address,
            ) =>
              address.toLowerCase() ===
              viewerWallet,
          );
      }

      // --- MASTER ACCESS CHECK ---
      if (
        !isCreator &&
        !isFree &&
        !validPurchase &&
        !hasPurchasedCrypto
      ) {
        return res
          .status(
            403,
          )
          .json(
            {
              message:
                "Access denied. Paywall active.",
            },
          );
      }

      // 3. Generate the 15-Minute Self-Destructing URL
      const command =
        new GetObjectCommand(
          {
            Bucket:
              process
                .env
                .S3_BUCKET_NAME,
            Key: content.fileKey,
          },
        );

      // 900 seconds = 15 minutes
      const signedUrl =
        await getSignedUrl(
          s3Client,
          command,
          {
            expiresIn: 900,
          },
        );

      res
        .status(
          200,
        )
        .json(
          {
            streamUrl:
              signedUrl,
          },
        );
    } catch (error) {
        console.error("Stream generation error:", error);
        res.status(500).json({ message: 'Failed to generate secure stream.' });
    }
};