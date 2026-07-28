/** @type {import('tailwindcss').Config} */
export default {
  content:
    [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
  theme: {
    extend:
      {
        colors:
          {
            nippy:
              {
                onyx: "#121212", // Deep Onyx (Main Background)
                obsidian:
                  "#1E1E1E", // Cards & Modals
                coral:
                  "#FF5A5F", // Electric Coral (Primary Buttons)
                coralHover:
                  "#FF385C",
                mint: "#00E396", // USDT Mint (Finance/Trust)
                blush:
                  "#FCF8F8", // Light Text
              },
          },
        fontFamily:
          {
            sans: [
              "Plus Jakarta Sans",
              "system-ui",
              "sans-serif",
            ], // Premium modern font
          },
      },
  },
  plugins:
    [],
};
