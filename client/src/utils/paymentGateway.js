/**
 * Smart Gateway Router for Paystack
 * If the fan is paying in a natively supported currency, route it directly.
 * If they are paying in an arbitrary currency, force conversion to NGN.
 */
export const getSmartGatewayConfig =
  (
    fanAmount,
    fanCurrency,
    exchangeRates,
  ) => {
    // Add any future native Paystack currencies here
    const NATIVE_CURRENCIES =
      [
        "NGN",
        "USD",
      ];
    const normalizedCurrency =
      fanCurrency?.toUpperCase() ||
      "USD";

    if (
      NATIVE_CURRENCIES.includes(
        normalizedCurrency,
      )
    ) {
      // Bypass FX translation, pass native currency straight to Paystack
      return {
        currency:
          normalizedCurrency,
        amountInSubunits:
          Math.round(
            fanAmount *
              100,
          ),
      };
    }

    // Foreign arbitrary currency (EUR, CAD, GHS, etc.) -> Force FX translation into NGN
    const fanRate =
      exchangeRates[
        normalizedCurrency
      ] ||
      1;
    const ngnRate =
      exchangeRates[
        "NGN"
      ] ||
      1500; // Fallback NGN rate safeguard

    // Reverse engineer to base USD, then scale to NGN
    const priceInUSD =
      fanAmount /
      fanRate;
    const priceInNGN =
      priceInUSD *
      ngnRate;

    return {
      currency:
        "NGN",
      amountInSubunits:
        Math.round(
          priceInNGN *
            100,
        ),
    };
  };
