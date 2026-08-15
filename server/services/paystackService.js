// server/services/paystackService.js
const axios = require("axios");

const PAYSTACK_SECRET_KEY =
  process
    .env
    .PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL =
  "https://api.paystack.co";

/**
 * Executes a fiat payout to a creator's Nigerian bank account.
 * @param {Object} user - The populated User mongoose document
 * @param {Number} amountInNaira - The exact amount to send in NGN (NOT Kobo. The function handles the conversion).
 * @param {String} reference - Your internal unique transaction ID
 */
exports.processFiatPayout =
  async (
    user,
    amountInNaira,
    reference,
  ) => {
    try {
      // 1. RUTHLESS VALIDATION
      if (
        user.payoutMethod !==
        "bank"
      )
        throw new Error(
          "User payout method is not set to bank.",
        );
      if (
        !user.accountNumber ||
        !user.bankCode ||
        !user.accountName
      ) {
        throw new Error(
          "Incomplete bank details. Missing account number, name, or bank code.",
        );
      }
      if (
        amountInNaira <
        100
      )
        throw new Error(
          "Payout amount too low.",
        );

      // Paystack requires amounts in the lowest denomination (Kobo for NGN)
      const amountInKobo =
        Math.round(
          amountInNaira *
            100,
        );

      // 2. CREATE TRANSFER RECIPIENT
      // This securely binds the account to a Paystack tracking code
      const recipientPayload =
        {
          type: "nuban",
          name: user.accountName,
          account_number:
            user.accountNumber,
          bank_code:
            user.bankCode,
          currency:
            "NGN",
        };

      const recipientRes =
        await axios.post(
          `${PAYSTACK_BASE_URL}/transferrecipient`,
          recipientPayload,
          {
            headers:
              {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type":
                  "application/json",
              },
          },
        );

      if (
        !recipientRes
          .data
          .status
      ) {
        throw new Error(
          `Paystack Recipient Error: ${recipientRes.data.message}`,
        );
      }

      const recipientCode =
        recipientRes
          .data
          .data
          .recipient_code;

      // 3. INITIATE THE TRANSFER
      const transferPayload =
        {
          source:
            "balance", // Tells Paystack to pull from your platform's balance
          amount:
            amountInKobo,
          reference:
            reference, // Your database transaction ID to prevent duplicate payouts
          recipient:
            recipientCode,
          reason: `Creator Payout - ${user.username}`,
        };

      const transferRes =
        await axios.post(
          `${PAYSTACK_BASE_URL}/transfer`,
          transferPayload,
          {
            headers:
              {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type":
                  "application/json",
              },
          },
        );

      if (
        !transferRes
          .data
          .status
      ) {
        throw new Error(
          `Paystack Transfer Error: ${transferRes.data.message}`,
        );
      }

      // Return the pending transfer data so you can log it in your database
      return {
        success: true,
        transferCode:
          transferRes
            .data
            .data
            .transfer_code,
        status:
          transferRes
            .data
            .data
            .status, // Usually "pending" or "success"
      };
    } catch (error) {
      const errorMessage =
        error
          .response
          ?.data
          ?.message ||
        error.message;
      console.error(
        "Payout Execution Failed:",
        errorMessage,
      );
      return {
        success: false,
        error:
          errorMessage,
      };
    }
  };
