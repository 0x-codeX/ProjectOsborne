const cron = require("node-cron");
const Content = require("../models/Content");

// You will need to import your specific Cloudflare delete function here.
// Assuming you have a utility for this, e.g., deleteFromR2 or deleteFromStream
const {
  deleteFromCloudflare,
} = require("../utils/cloudflare");

const startReaper =
  () => {
    // This syntax means: Run every day at 3:00 AM server time
    cron.schedule(
      "0 3 * * *",
      async () => {
        console.log(
          "--- REAPER CRON: Scanning for expired sunset content ---",
        );

        try {
          // Calculate the exact millisecond 30 days ago
          const thirtyDaysAgo =
            new Date();
          thirtyDaysAgo.setDate(
            thirtyDaysAgo.getDate() -
              30,
          );

          // Find all content marked 'sunset' where the sunset date is OLDER than 30 days ago
          const expiredContent =
            await Content.find(
              {
                status:
                  "sunset",
                sunsetAt:
                  {
                    $lt: thirtyDaysAgo,
                  },
              },
            );

          if (
            expiredContent.length ===
            0
          ) {
            console.log(
              "REAPER: No expired content found today.",
            );
            return;
          }

          console.log(
            `REAPER: Found ${expiredContent.length} ghost items to destroy.`,
          );

          // We use a for...of loop to handle async/await properly.
          // Do NOT use .forEach() here.
          for (const post of expiredContent) {
            try {
              // STEP 1: Destroy the actual file on Cloudflare.
              // If this throws an error, it skips Step 2, preventing zombie files.
              if (
                post.fileKey
              ) {
                await deleteFromCloudflare(
                  post.fileKey,
                );
              }

              // STEP 2: Erase the record from MongoDB forever.
              await Content.findByIdAndDelete(
                post._id,
              );

              console.log(
                `REAPER: Permanently vaporized post ${post._id}`,
              );
            } catch (itemError) {
              // We wrap the inside of the loop in a try/catch.
              // If one video fails to delete, we log it and move to the next one
              // instead of crashing the entire daily job.
              console.error(
                `REAPER: Failed to process post ${post._id}:`,
                itemError,
              );
            }
          }
        } catch (error) {
          console.error(
            "REAPER CRON FATAL ERROR:",
            error,
          );
        }
      },
    );
  };

module.exports =
  startReaper;
