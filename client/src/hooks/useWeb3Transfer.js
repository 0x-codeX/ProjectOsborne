import { useState } from "react";
import { ethers } from "ethers";

// Polygon Amoy Testnet Configurations
const POLYGON_CHAIN_ID =
  "0x13882"; // 80002 in hex

// IMPORTANT: Replace this with the Fake USDT address you deployed on Amoy!
const USDT_CONTRACT_ADDRESS =
  "0x3A08E5dC512f099648e491bA38D0c7E2efFbb7DB";
const GATEWAY_ADDRESS =
  "0x8ad6CB0559e5FEa826b8A359D27C7730Ba488779";

// Minimal Fan-Facing ABIs
const USDT_ABI =
  [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
  ];

const GATEWAY_ABI =
  [
    "function purchaseWithERC20(address token, address creator, bytes32 contentId, uint256 price) external",
    "function purchaseWithNative(address payable creator, bytes32 contentId) external payable",
  ];

export const useWeb3Transfer =
  () => {
    const [
      isProcessingTx,
      setIsProcessingTx,
    ] =
      useState(
        false,
      );
    const [
      txError,
      setTxError,
    ] =
      useState(
        null,
      );

    const ensurePolygonNetwork =
      async () => {
        try {
          console.log(
            "About to switch network...",
          );
          await window.ethereum.request(
            {
              method:
                "wallet_switchEthereumChain",
              params:
                [
                  {
                    chainId:
                      POLYGON_CHAIN_ID,
                  },
                ],
            },
          );
          console.log(
            "Network switched successfully.",
          );
        } catch (switchError) {
          if (
            switchError.code ===
            4902
          ) {
            try {
              await window.ethereum.request(
                {
                  method:
                    "wallet_addEthereumChain",
                  params:
                    [
                      {
                        chainId:
                          POLYGON_CHAIN_ID,
                        chainName:
                          "Polygon Amoy Testnet",
                        rpcUrls:
                          [
                            "https://rpc-amoy.polygon.technology/",
                          ],
                        nativeCurrency:
                          {
                            name: "POL",
                            symbol:
                              "POL",
                            decimals: 18,
                          },
                        blockExplorerUrls:
                          [
                            "https://amoy.polygonscan.com/",
                          ],
                      },
                    ],
                },
              );
            } catch (addError) {
              throw new Error(
                "Failed to add Amoy network to wallet.",
              );
            }
          } else {
            throw new Error(
              "Please switch to the Amoy Testnet in your wallet.",
            );
          }
        }
      };

    // Notice the addition of contentId
    const transferUSDT =
      async (
        creatorAddress,
        priceAmount,
        contentId = null,
      ) => {
        setIsProcessingTx(
          true,
        );
        setTxError(
          null,
        );

        try {
          if (
            !window.ethereum
          ) {
            throw new Error(
              "No Web3 wallet detected. Please install MetaMask.",
            );
          }

          await ensurePolygonNetwork();

          const provider =
            new ethers.BrowserProvider(
              window.ethereum,
            );
          const signer =
            await provider.getSigner();

          const usdtContract =
            new ethers.Contract(
              USDT_CONTRACT_ADDRESS,
              USDT_ABI,
              signer,
            );
          const gatewayContract =
            new ethers.Contract(
              GATEWAY_ADDRESS,
              GATEWAY_ABI,
              signer,
            );

          const amountParsed =
            ethers.parseUnits(
              priceAmount.toString(),
              6,
            );

          // Convert MongoDB ObjectId string to bytes32 for the smart contract
          let bytes32ContentId;
          if (
            contentId
          ) {
            // Ensure it has the 0x prefix for ethers.js padding
            const hexId =
              contentId.startsWith(
                "0x",
              )
                ? contentId
                : "0x" +
                  contentId;
            bytes32ContentId =
              ethers.zeroPadValue(
                hexId,
                32,
              );
          } else {
            bytes32ContentId =
              ethers.ZeroHash; // Fallback for subscriptions without a specific post
          }

          console.log(
            "1. Requesting USDT Approval...",
          );
          const approveTx =
            await usdtContract.approve(
              GATEWAY_ADDRESS,
              amountParsed,
            );
          await approveTx.wait(
            1,
          );

          console.log(
            "2. Approval confirmed. Executing Gateway Purchase...",
          );
          const purchaseTx =
            await gatewayContract.purchaseWithERC20(
              USDT_CONTRACT_ADDRESS,
              creatorAddress,
              bytes32ContentId,
              amountParsed,
            );

          const receipt =
            await purchaseTx.wait(
              1,
            );

          setIsProcessingTx(
            false,
          );
          return receipt.hash;
        } catch (error) {
          console.error(
            "Web3 Transfer Error:",
            error,
          );

          let errorMessage =
            "Transaction failed.";
          if (
            error.code ===
              "ACTION_REJECTED" ||
            error.message.includes(
              "rejected",
            )
          ) {
            errorMessage =
              "Transaction was rejected by the user.";
          } else if (
            error.message.includes(
              "insufficient funds",
            ) ||
            error.message.includes(
              "exceeds balance",
            )
          ) {
            errorMessage =
              "Insufficient USDT or MATIC (for gas) in your wallet.";
          } else {
            errorMessage =
              error.message ||
              "An unknown Web3 error occurred.";
          }

          setTxError(
            errorMessage,
          );
          setIsProcessingTx(
            false,
          );
          throw new Error(
            errorMessage,
          );
        }
      };

    return {
      transferUSDT,
      isProcessingTx,
      txError,
    };
  };
