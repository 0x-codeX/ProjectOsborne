const axios = require("axios");

// Cache mechanism for the global multi-currency rate map
let cachedRates =
  null;
let lastCacheTime = 0;
const CACHE_TTL_MS =
  15 *
  60 *
  1000; // 15-minute cache for P2P Army

// Global Fallback Matrix (in case all APIs fail completely)
const P2P_FALLBACK_RATES =
  {
    USD: {
      buy: 1,
      sell: 1,
      mid: 1,
    },
    NGN: {
      buy: 1400,
      sell: 1400,
      mid: 1400,
    },
    GHS: {
      buy: 15.0,
      sell: 15.0,
      mid: 15.0,
    },
    KES: {
      buy: 130.0,
      sell: 130.0,
      mid: 130.0,
    },
  };

/**
 * Helper: Fetches live P2P Army prices (BUY/SELL averages across payment methods) for a single fiat currency
 */
async function fetchP2PArmyRate(
  fiatCurrency,
) {
  if (
    fiatCurrency ===
    "USD"
  ) {
    return {
      buy: 1,
      sell: 1,
      mid: 1,
    };
  }

  const apiKey =
    process.env.P2PARMY_API_KEY?.trim();
  const baseUrl =
    process.env.P2PARMY_BASE_URL?.trim() ||
    "https://p2p.army/v1/api";
  const market =
    process.env.P2PARMY_MARKET?.trim() ||
    "bybit";

  if (
    !apiKey
  ) {
    throw new Error(
      "P2PARMY_API_KEY is not configured in .env",
    );
  }

  const response =
    await axios.post(
      `${baseUrl}/get_p2p_prices`,
      {
        market:
          market,
        fiat: fiatCurrency,
        asset:
          "USDT",
        limit: 10,
      },
      {
        headers:
          {
            "X-APIKEY":
              apiKey,
            "Content-Type":
              "application/json",
          },
        timeout: 6000,
      },
    );

  const data =
    response.data;
  if (
    data?.status ===
      1 &&
    Array.isArray(
      data?.prices,
    ) &&
    data
      .prices
      .length >
      0
  ) {
    // Filter out payment methods with zeroed averages
    const validMethods =
      data.prices.filter(
        (
          p,
        ) =>
          p.avg_price_BUY >
            0 &&
          p.avg_price_SELL >
            0,
      );

    const priceList =
      validMethods.length >
      0
        ? validMethods
        : data.prices;

    const avgBuy =
      priceList.reduce(
        (
          acc,
          curr,
        ) =>
          acc +
          (curr.avg_price_BUY ||
            0),
        0,
      ) /
      priceList.length;

    const avgSell =
      priceList.reduce(
        (
          acc,
          curr,
        ) =>
          acc +
          (curr.avg_price_SELL ||
            0),
        0,
      ) /
      priceList.length;

    return {
      buy:
        Math.round(
          avgBuy *
            100,
        ) /
        100,
      sell:
        Math.round(
          avgSell *
            100,
        ) /
        100,
      mid:
        Math.round(
          ((avgBuy +
            avgSell) /
            2) *
            100,
        ) /
        100,
    };
  }

  throw new Error(
    `P2P Army returned no valid prices for ${fiatCurrency}`,
  );
}

/**
 * Fetches Live Global P2P rates across all quote currencies for dashboard previews
 * @param {boolean} forceRefresh - If true, bypasses the cache to get live prevailing rates
 */
async function getLiveP2PRates(
  forceRefresh = false,
) {
  const now =
    Date.now();

  // Return cached rate map if valid and forceRefresh is false
  if (
    !forceRefresh &&
    cachedRates &&
    now -
      lastCacheTime <
      CACHE_TTL_MS
  ) {
    return cachedRates;
  }

  const quoteAssets =
    (
      process
        .env
        .QUOTE_ASSETS ||
      "NGN,GHS,KES,ZAR,GBP,EUR"
    ).split(
      ",",
    );

  // TIER 1: Primary API - P2P Army (Queries each target fiat)
  if (
    process
      .env
      .P2PARMY_API_KEY
  ) {
    try {
      const rateMap =
        {
          USD: {
            buy: 1,
            sell: 1,
            mid: 1,
          },
        };

      // Concurrently query P2P rates for configured fiats
      await Promise.all(
        quoteAssets.map(
          async (
            fiat,
          ) => {
            const trimmedFiat =
              fiat.trim();
            if (
              trimmedFiat ===
              "USD"
            )
              return;
            try {
              const rates =
                await fetchP2PArmyRate(
                  trimmedFiat,
                );
              rateMap[
                trimmedFiat
              ] =
                rates;
            } catch (err) {
              console.warn(
                `[!] P2P Army skip for ${trimmedFiat}: ${err.message}`,
              );
            }
          },
        ),
      );

      if (
        Object.keys(
          rateMap,
        )
          .length >
        1
      ) {
        cachedRates =
          rateMap;
        lastCacheTime =
          now;
        console.log(
          `[i] P2P Global Map Updated via P2P Army. Currencies loaded: ${
            Object.keys(
              rateMap,
            )
              .length
          }`,
        );
        return cachedRates;
      }
    } catch (error) {
      console.warn(
        "[-] P2P Army batch update failed:",
        error.message,
      );
    }
  }

  // TIER 2: Secondary Fallback - CoinAPI
  const coinApiKey =
    process.env.COINAPI_KEY?.trim();
  if (
    coinApiKey
  ) {
    try {
      const coinApiBase =
        process.env.COINAPI_BASE_URL?.trim() ||
        "https://rest.coinapi.io/v1";
      const url = `${coinApiBase}/exchangerate/USDT?filter_asset_id=${encodeURIComponent(
        quoteAssets.join(
          ",",
        ),
      )}`;

      const res =
        await axios.get(
          url,
          {
            headers:
              {
                Authorization:
                  coinApiKey,
                Accept:
                  "application/json",
              },
            timeout: 5000,
          },
        );

      if (
        res
          .data
          ?.rates &&
        Array.isArray(
          res
            .data
            .rates,
        )
      ) {
        const rateMap =
          {
            USD: {
              buy: 1,
              sell: 1,
              mid: 1,
            },
          };
        res.data.rates.forEach(
          (
            item,
          ) => {
            if (
              item.asset_id_quote &&
              typeof item.rate ===
                "number"
            ) {
              rateMap[
                item.asset_id_quote
              ] =
                {
                  buy: item.rate,
                  sell: item.rate,
                  mid: item.rate,
                };
            }
          },
        );

        cachedRates =
          rateMap;
        lastCacheTime =
          now;
        console.log(
          `[i] P2P Global Map Updated via CoinAPI fallback.`,
        );
        return cachedRates;
      }
    } catch (coinErr) {
      console.warn(
        "[-] CoinAPI fallback failed:",
        coinErr.message,
      );
    }
  }

  // TIER 3: Treasury Fallback Matrix
  console.warn(
    "[!] All live P2P APIs failed. Engaging Global Treasury Fallback Matrix.",
  );
  return (
    cachedRates ||
    P2P_FALLBACK_RATES
  );
}

/**
 * Calculates a liquidation quote dynamically using exact BUY/SELL averages from P2P Army
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

  const [
    fromCurr,
    toCurr,
  ] =
    direction.split(
      "_TO_",
    );
  if (
    !fromCurr ||
    !toCurr ||
    (fromCurr !==
      "USDT" &&
      toCurr !==
        "USDT")
  ) {
    throw new Error(
      "Invalid liquidation direction format. Transaction must involve USDT.",
    );
  }

  const fiatCurrency =
    fromCurr ===
    "USDT"
      ? toCurr
      : fromCurr;

  let baseRate = 1;
  let rawP2PRates =
    null;

  // Try direct live fetch from P2P Army for maximum accuracy
  try {
    rawP2PRates =
      await fetchP2PArmyRate(
        fiatCurrency,
      );
  } catch (err) {
    console.warn(
      `[!] Direct P2P Army rate fetch failed for ${fiatCurrency}, falling back to general map:`,
      err.message,
    );
    const globalRates =
      await getLiveP2PRates(
        true,
      );
    baseRate =
      globalRates[
        fiatCurrency
      ] ||
      P2P_FALLBACK_RATES[
        fiatCurrency
      ] ||
      1;
  }

  let executionRate;
  let estimatedPayout;
  let liveMarketRateUsed;

  const fallbackBuy =
    typeof baseRate ===
    "object"
      ? baseRate.buy
      : baseRate;
  const fallbackSell =
    typeof baseRate ===
    "object"
      ? baseRate.sell
      : baseRate;

  if (
    direction.startsWith(
      "USDT_TO_",
    )
  ) {
    liveMarketRateUsed =
      rawP2PRates
        ? rawP2PRates.buy
        : fallbackBuy;
    executionRate =
      liveMarketRateUsed *
      (1 -
        spreadPercentage);
    estimatedPayout =
      parsedAmount *
      executionRate;
  } else if (
    direction.endsWith(
      "_TO_USDT",
    )
  ) {
    liveMarketRateUsed =
      rawP2PRates
        ? rawP2PRates.sell
        : fallbackSell;
    executionRate =
      liveMarketRateUsed *
      (1 +
        spreadPercentage);
    estimatedPayout =
      parsedAmount /
      executionRate;
  } else {
    throw new Error(
      "Failed to resolve dynamic liquidation direction.",
    );
  }

  return {
    amount:
      parsedAmount,
    direction,
    fiatCurrency,
    liveMarketRate:
      liveMarketRateUsed,
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
        1000, // Quote expires in 5 minutes
  };
}

module.exports =
  {
    getLiveP2PRates,
    generateLiquidationQuote,
  };
