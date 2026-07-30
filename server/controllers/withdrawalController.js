const mongoose = require("mongoose");
const User = require("../models/User"); // Assuming this holds your creator balances
const Withdrawal = require("../models/Withdrawal"); // The ledger your worker polls

const requestWithdrawal =
  async (
    req,
    res,
  ) => {
    // `req.user.id` should come from your JWT/session auth middleware
    const userId =
      req
        .user
        .id;
    const {
      amount,
      destinationAddress,
    } =
      req.body;

    // 1. Strict Input Validation
    if (
      !amount ||
      amount <=
        0
    ) {
      return res
        .status(
          400,
        )
        .json(
          {
            error:
              "Invalid withdrawal amount",
          },
        );
    }

    // Validate it's a proper EVM address (since you're on Polygon)
    const evmRegex =
      /^0x[a-fA-F0-9]{40}$/;
    if (
      !destinationAddress ||
      !evmRegex.test(
        destinationAddress,
      )
    ) {
      return res
        .status(
          400,
        )
        .json(
          {
            error:
              "Invalid Polygon wallet address",
          },
        );
    }

    // 2. Initialize the Database Transaction
    const session =
      await mongoose.startSession();
    session.startTransaction();

    try {
      // 3. Atomic Balance Check & Deduction
      // The $gte (greater than or equal) check happens AT THE SAME TIME as the deduction.
      // This makes race conditions mathematically impossible at the database level.
      const updatedUser =
        await User.findOneAndUpdate(
          {
            _id: userId,
            balance:
              {
                $gte: amount,
              },
          },
          {
            $inc: {
              balance:
                -amount,
            },
          },
          {
            returnDocument:
              "after",
            session,
          },
        );

      // If no user was returned, they either don't exist or don't have enough money.
      if (
        !updatedUser
      ) {
        throw new Error(
          "INSUFFICIENT_FUNDS",
        );
      }

      // 4. Create the PENDING ledger entry
      // This is the exact row your Treasury Worker will pick up and execute on-chain.
      const newWithdrawal =
        new Withdrawal(
          {
            userId,
            amount,
            destinationAddress,
            status:
              "PENDING",
            txHash:
              null, // Worker will fill this in later
          },
        );

      await newWithdrawal.save(
        {
          session,
        },
      );

      // 5. Commit the Transaction
      // If the server crashes anywhere before this line, the balance deduction is undone.
      await session.commitTransaction();
      session.endSession();

      return res
        .status(
          200,
        )
        .json(
          {
            message:
              "Withdrawal queued successfully",
            withdrawalId:
              newWithdrawal._id,
          },
        );
    } catch (error) {
      // 6. Graceful Rollback
      await session.abortTransaction();
      session.endSession();

      if (
        error.message ===
        "INSUFFICIENT_FUNDS"
      ) {
        return res
          .status(
            400,
          )
          .json(
            {
              error:
                "Insufficient funds for this withdrawal.",
            },
          );
      }

      console.error(
        "Withdrawal Transaction Error:",
        error,
      );
      return res
        .status(
          500,
        )
        .json(
          {
            error:
              "Internal server error processing withdrawal.",
          },
        );
    }
  };

module.exports =
  {
    requestWithdrawal,
  };
