export const STATUS_WORDS = [
  {
    word: "Pending",
    detail: "The contact has not answered. This is not a confirmation.",
  },
  {
    word: "Confirmed",
    detail: "The contact used their passkey before it expired. This does not mean they are safe.",
  },
  {
    word: "Could not verify",
    detail: "They denied it, it expired, or the passkey check failed.",
  },
] as const;

export type StatusWord = (typeof STATUS_WORDS)[number]["word"];
