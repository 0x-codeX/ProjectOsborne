import {
  useState,
  useEffect,
} from "react";
import api from "../utils/api";

/**
 * Custom hook to dynamically convert and markup creator prices for the Fan view.
 *
 * @param {number} creatorPrice - The exact price set by the creator in the DB
 * @param {string} creatorCurrency - The currency the creator priced the item in (e.g. NGN)
 */
export const useFanPrice =
  (
    creatorPrice,
    creatorCurrency,
  ) => {
    const [
      fanPrice,
      setFanPrice,
    ] =
      useState(
        null,
      );
    const [
      fanCurrency,
      setFanCurrency,
    ] =
      useState(
        "USD",
      );
    const [
      loading,
      setLoading,
    ] =
      useState(
        true,
      );

    useEffect(() => {
      // If the content is free, skip the math entirely
      if (
        !creatorPrice ||
        creatorPrice <=
          0
      ) {
        setFanPrice(
          0,
        );
        setLoading(
          false,
        );
        return;
      }

      const fetchRatesAndConvert =
        async () => {
          try {
            // 1. Get the Fan's preferred viewing currency
            const storedUser =
              JSON.parse(
                localStorage.getItem(
                  "nippy_user",
                ) ||
                  "{}",
              );
            const localCurrency =
              storedUser.preferredCurrency ||
              "USD";
            setFanCurrency(
              localCurrency,
            );

            // 2. Fetch live exchange rates from your backend
            // Assuming your API returns rates with USD as the base { NGN: 1500, GBP: 0.78, KES: 130 }
            const {
              data: rates,
            } =
              await api.get(
                "/exchange-rates",
              );

            // 3. Establish conversion rates
            const toUSDRate =
              rates[
                creatorCurrency
              ] ||
              1;
            const toFanRate =
              rates[
                localCurrency
              ] ||
              1;

            // 4. Convert Creator Price to Base USD, then to Fan Currency
            const priceInUSD =
              creatorPrice /
              toUSDRate;
            const exactFanPrice =
              priceInUSD *
              toFanRate;

            // 5. THE PROFIT SKIM: Force round UP to the nearest 0.50
            // e.g., 3.33 becomes 3.50.
            const roundedDisplayPrice =
              Math.ceil(
                exactFanPrice *
                  2,
              ) /
              2;

            setFanPrice(
              roundedDisplayPrice,
            );
          } catch (error) {
            console.error(
              "Failed to fetch exchange rates. Falling back to default pricing.",
            );
            // Fallback: Show original price and currency so the UI doesn't break
            setFanPrice(
              creatorPrice,
            );
            setFanCurrency(
              creatorCurrency,
            );
          } finally {
            setLoading(
              false,
            );
          }
        };

      fetchRatesAndConvert();
    }, [
      creatorPrice,
      creatorCurrency,
    ]);

    return {
      fanPrice,
      fanCurrency,
      loading,
    };
  };
