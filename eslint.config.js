import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        chrome: "readonly",
        Storage: "readonly",
        Favorites: "readonly",
        FavoritesUI: "readonly",
        History: "readonly",
        HistoryUI: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none" }],
    },
  },
  {
    ignores: ["node_modules/**"],
  },
];
