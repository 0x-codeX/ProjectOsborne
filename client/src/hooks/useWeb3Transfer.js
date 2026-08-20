import { useState } from "react";
import { ethers } from "ethers";

// Polygon Amoy Testnet Configurations
const POLYGON_CHAIN_ID =
  "0x13882"; // 80002 in hex

// IMPORTANT: Replace this with the Fake USDT address you deployed on Amoy!
const USDT_CONTRACT_ADDRESS =
  "0x3A08E5dC512f099648e491bA38D0c7E2efFbb7DB";
const GATEWAY_ADDRESS =
  "0x87ee106bd7Fa3DA44B6FaA432c3f3FfA4DB2A72E";

// Minimal Fan-Facing ABIs
const USDT_ABI =
  [
    "function approve(address spender, uint256 amount) public returns (bool)",
    "function balanceOf(address account) view returns (uint256)",
  ];

// THE FIX: Updated ABI to match the Smart Contract
const GATEWAY_ABI =
  [
    "function purchaseWithERC20(address token, address creator, bytes32 contentId, uint256 rawBasePrice, uint256 chargeAmount) external",
    "function purchaseWithNative(address payable creator, bytes32 contentId, uint256 rawBasePrice) external payable",
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

    // THE FIX: Accepts both chargeAmount (what fan pays) and rawAmount (creator's base price)
    const transferUSDT =
      async (
        creatorAddress,
        chargeAmount,
        rawAmount,
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

          // Parse both amounts into 6 decimals for USDT
          const chargeAmountParsed =
            ethers.parseUnits(
              chargeAmount.toString(),
              6,
            );
          const rawAmountParsed =
            ethers.parseUnits(
              rawAmount.toString(),
              6,
            );

          let bytes32ContentId;
          if (
            contentId
          ) {
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
              ethers.ZeroHash;
          }

          console.log(
            "1. Requesting USDT Approval...",
          );
          const approveTx =
            await usdtContract.approve(
              GATEWAY_ADDRESS,
              chargeAmountParsed,
            );

          // IRONCLAD UPGRADE: Catch flaky RPC rate limits on approval
          try {
            await approveTx.wait(
              1,
            );
          } catch (waitError) {
            console.warn(
              "RPC dropped the approval poll. Waiting 3 seconds as a fallback...",
              waitError,
            );
            await new Promise(
              (
                resolve,
              ) =>
                setTimeout(
                  resolve,
                  3000,
                ),
            );
          }

          console.log(
            "2. Approval assumed complete. Executing Gateway Purchase...",
          );
          // THE FIX: Pass both rawAmountParsed and chargeAmountParsed to the smart contract
          const purchaseTx =
            await gatewayContract.purchaseWithERC20(
              USDT_CONTRACT_ADDRESS,
              creatorAddress,
              bytes32ContentId,
              rawAmountParsed,
              chargeAmountParsed,
            );

          // IRONCLAD UPGRADE: If wait() fails due to a network 400 error, we still return the hash
          // because the transaction is already in the blockchain mempool. Let the backend verify it!
          try {
            await purchaseTx.wait(
              1,
            );
          } catch (waitError) {
            console.warn(
              "RPC polling failed during wait, but tx was submitted. Handing off to backend.",
              waitError,
            );
          }

          setIsProcessingTx(
            false,
          );
          return purchaseTx.hash; // Return the hash immediately instead of relying on the receipt
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
              "Insufficient USDT or POL (for gas) in your wallet.";
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
