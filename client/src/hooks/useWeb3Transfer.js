import { useState } from "react";
import { ethers } from "ethers";

// Polygon Mainnet Configurations
const POLYGON_CHAIN_ID =
  "0x89"; // 137 in hex
const USDT_CONTRACT_ADDRESS =
  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

// We only need the transfer function for this specific hook
const USDT_ABI =
  [
    "function transfer(address to, uint256 value) public returns (bool)",
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

    // Helper to force network switch
    const ensurePolygonNetwork =
      async () => {
        try {
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
        } catch (switchError) {
          // This error code means the chain has not been added to MetaMask.
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
                          "Polygon Mainnet",
                        rpcUrls:
                          [
                            "https://polygon-rpc.com/",
                          ],
                        nativeCurrency:
                          {
                            name: "MATIC",
                            symbol:
                              "MATIC",
                            decimals: 18,
                          },
                        blockExplorerUrls:
                          [
                            "https://polygonscan.com/",
                          ],
                      },
                    ],
                },
              );
            } catch (addError) {
              throw new Error(
                "Failed to add Polygon network to wallet.",
              );
            }
          } else {
            throw new Error(
              "Please switch to the Polygon network in your wallet.",
            );
          }
        }
      };

    const transferUSDT =
      async (
        receiverAddress,
        priceAmount,
      ) => {
        setIsProcessingTx(
          true,
        );
        setTxError(
          null,
        );

        try {
          // 1. Check if wallet is installed
          if (
            !window.ethereum
          ) {
            throw new Error(
              "No Web3 wallet detected. Please install MetaMask or use a dApp browser.",
            );
          }

          // 2. Ensure Polygon Network
          await ensurePolygonNetwork();

          // 3. Initialize Ethers v6 Provider and Signer
          const provider =
            new ethers.BrowserProvider(
              window.ethereum,
            );
          const signer =
            await provider.getSigner();

          // 4. Initialize Contract
          const usdtContract =
            new ethers.Contract(
              USDT_CONTRACT_ADDRESS,
              USDT_ABI,
              signer,
            );

          // 5. Format Amount (USDT on Polygon has 6 decimals, NEVER use parseEther here)
          const amountParsed =
            ethers.parseUnits(
              priceAmount.toString(),
              6,
            );

          // 6. Execute Transaction
          const tx =
            await usdtContract.transfer(
              receiverAddress,
              amountParsed,
            );

          // 7. Wait for Receipt (1 block confirmation)
          const receipt =
            await tx.wait(
              1,
            );

          setIsProcessingTx(
            false,
          );
          return receipt.hash; // Return the hash so the backend can verify it
        } catch (error) {
          console.error(
            "Web3 Transfer Error:",
            error,
          );

          // Parse common Web3 errors for better UI feedback
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
          ); // Throw so the component can catch it
        }
      };

    return {
      transferUSDT,
      isProcessingTx,
      txError,
    };
  };
