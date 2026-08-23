// server/utils/p2pLiquidity.js
const axios = require("axios");

// Cache mechanism for the dashboard preview (saves API limits)
let cachedRate =
  null;
let lastCacheTime = 0;
const CACHE_TTL_MS =
  24 *
  60 *
  60 *
  1000; // 24 hours

const P2P_FALLBACK_RATES =
  {
    USDT_NGN: 1500, // Treasury fallback rate (1 USDT = 1500 NGN)
  };

/**
 * Fetches Live P2P rates specifically for USDT <-> NGN
 * @param {boolean} forceRefresh - If true, bypasses the cache to get the live prevailing rate
 */
async function getLiveP2PRates(
  forceRefresh = false,
) {
  const now =
    Date.now();

  const monierateKey =
    process.env.MONIERATE_API_KEY?.trim();
  const monierateBase =
    process.env.MONIERATE_BASE_URL?.trim() ||
    "https://api.monierate.com";

  // Return cached rate if valid and forceRefresh is false
  if (
    !forceRefresh &&
    cachedRate &&
    now -
      lastCacheTime <
      CACHE_TTL_MS
  ) {
    return cachedRate;
  }

  // TIER 1: Primary API - Monierate
  if (
    monierateKey
  ) {
    try {
      const cleanBase =
        monierateBase.endsWith(
          "/",
        )
          ? monierateBase.slice(
              0,
              -1,
            )
          : monierateBase;

      // If POST /core/rates/convert.json throws a 404 Not Found, change this string to just "/rates/convert.json"
      const url = `${cleanBase}/core/rates/convert.json`;

      // Using the POST variant guarantees strict data types and bypasses their URL parser bugs
      const res =
        await axios.post(
          url,
          {
            from: "USDT",
            to: "NGN",
            amount: 1,
            market:
              "parallel",
          },
          {
            headers:
              {
                api_key:
                  monierateKey,
                "Content-Type":
                  "application/json",
              },
            timeout: 5000,
          },
        );

      const rateData =
        res.data;
      const rate =
        rateData
          ?.data
          ?.rate;

      if (
        rate
      ) {
        cachedRate =
          parseFloat(
            rate,
          );
        lastCacheTime =
          now;
        console.log(
          `[i] P2P Rate updated via Monierate: ₦${cachedRate}`,
        );
        return cachedRate;
      } else {
        console.warn(
          "[?] Monierate connected, but rate could not be extracted. Payload:",
          JSON.stringify(
            rateData,
          ),
        );
      }
    } catch (error) {
      console.warn(
        "[-] Monierate API failed. Status:",
        error
          .response
          ?.status,
      );
      console.warn(
        "[-] Monierate Error Details:",
        error
          .response
          ?.data ||
          error.message,
      );
    }
  }

  // TIER 2: Secondary API - P2PArmy
  // TEMPORARILY DISABLED until you replace the dummy URL in your .env with their actual endpoint
  /*
  const p2pArmyKey = process.env.P2PARMY_API_KEY?.trim();
  const p2pArmyBase = process.env.P2PARMY_BASE_URL?.trim();

  if (p2pArmyKey && p2pArmyBase && !p2pArmyBase.includes("api.p2parmy.com")) {
    try {
      const endpoint = "/v2/market/usdt_ngn";
      const url = `${p2pArmyBase}${endpoint}`;

      const res = await axios.get(url, {
        headers: {
          "Authorization": `Bearer ${p2pArmyKey}`,
          "x-api-key": p2pArmyKey
        },
        timeout: 5000
      });

      const rate = res.data?.usdt_ngn || res.data?.rate || res.data?.data?.rate;
      if (rate) {
        cachedRate = parseFloat(rate);
        lastCacheTime = now;
        console.log(`[i] P2P Rate updated via P2PArmy: ₦${cachedRate}`);
        return cachedRate;
      }
    } catch (error) {
      console.warn("[-] P2PArmy API failed:", error.response?.data || error.message);
    }
  }
  */

  // TIER 3: Treasury Fallback
  console.warn(
    "[!] All live P2P APIs failed. Engaging Treasury Fallback.",
  );
  return (
    cachedRate ||
    P2P_FALLBACK_RATES.USDT_NGN
  );
}

/**
 * Calculates a liquidation quote with a protective spread (cushion)
 */
async function generateLiquidationQuote(
  amount,
  direction,
  spreadPercentage = 0.03,
) {
  const parsedAmount =
    parseFloat(
      amount,
    );
  if (
    isNaN(
      parsedAmount,
    ) ||
    parsedAmount <=
      0
  ) {
    throw new Error(
      "Invalid liquidation amount.",
    );
  }

  // forceRefresh = true ensures trades never execute on stale/cached rates
  const liveRate =
    await getLiveP2PRates(
      true,
    );

  let executionRate;
  let estimatedPayout;

  if (
    direction ===
    "USDT_TO_NGN"
  ) {
    // Bank Creator selling USDT to Nippy: We buy it CHEAPER than market
    executionRate =
      liveRate *
      (1 -
        spreadPercentage);
    estimatedPayout =
      parsedAmount *
      executionRate;
  } else if (
    direction ===
    "NGN_TO_USDT"
  ) {
    // Crypto Creator buying USDT from Nippy: We sell it HIGHER than market
    executionRate =
      liveRate *
      (1 +
        spreadPercentage);
    estimatedPayout =
      parsedAmount /
      executionRate;
  } else {
    throw new Error(
      "Invalid liquidation direction.",
    );
  }

  return {
    amount:
      parsedAmount,
    direction,
    liveMarketRate:
      liveRate,
    executionRate:
      Math.round(
        executionRate *
          100,
      ) /
      100,
    estimatedPayout:
      Math.round(
        estimatedPayout *
          100,
      ) /
      100,
    spreadApplied:
      spreadPercentage *
      100,
    quoteExpiresAt:
      Date.now() +
      5 *
        60 *
        1000, // Quote strictly expires in 5 minutes
  };
}

module.exports =
  {
    getLiveP2PRates,
    generateLiquidationQuote,
  };
