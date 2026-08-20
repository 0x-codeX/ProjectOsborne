// scripts/whitelistToken.js
const {
  ethers,
} = require("ethers");
require("dotenv").config();

async function main() {
  // 1. Connect to RPC Node
  const rpcUrl =
    process
      .env
      .POLYGON_RPC_URL ||
    "https://rpc-amoy.polygon.technology/";
  const provider =
    new ethers.JsonRpcProvider(
      rpcUrl,
    );

  // 2. Connect the Owner Wallet (MUST be the private key that deployed the Gateway)
  const privateKey =
    process
      .env
      .PRIVATE_KEY;
  if (
    !privateKey
  ) {
    throw new Error(
      "Missing PRIVATE_KEY in your .env file.",
    );
  }
  const wallet =
    new ethers.Wallet(
      privateKey,
      provider,
    );

  const GATEWAY_ADDRESS =
    "0x87ee106bd7Fa3DA44B6FaA432c3f3FfA4DB2A72E";
  const USDT_ADDRESS =
    "0x3A08E5dC512f099648e491bA38D0c7E2efFbb7DB";

  // 3. Define ABI (Update this string to match the function name in your Solidity file!)
  const GATEWAY_ADMIN_ABI =
    [
      "function setSupportedToken(address token, bool isSupported) external",
      // IF your contract uses Option B, comment the line above and uncomment the line below:
      // "function addSupportedToken(address token) external"
    ];

  const gatewayContract =
    new ethers.Contract(
      GATEWAY_ADDRESS,
      GATEWAY_ADMIN_ABI,
      wallet,
    );

  console.log(
    `[i] Initiating Whitelist TX from Admin: ${wallet.address}...`,
  );

  // 4. Call the function (Adjust method call if using Option B)
  const tx =
    await gatewayContract.setSupportedToken(
      USDT_ADDRESS,
      true,
    );
  // For Option B, use: const tx = await gatewayContract.addSupportedToken(USDT_ADDRESS);

  console.log(
    `[+] Transaction broadcasted! Hash: ${tx.hash}`,
  );
  console.log(
    "[i] Waiting for Polygon network confirmation...",
  );

  const receipt =
    await tx.wait(
      1,
    );
  if (
    receipt.status ===
    1
  ) {
    console.log(
      `[SUCCESS] MockUSDT (${USDT_ADDRESS}) is now officially whitelisted on Gateway!`,
    );
  } else {
    console.error(
      "[-] Transaction reverted on-chain.",
    );
  }
}

main().catch(
  (
    error,
  ) => {
    console.error(
      "[-] Whitelisting failed:",
      error,
    );
    process.exit(
      1,
    );
  },
);
