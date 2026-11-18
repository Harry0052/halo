export type ChallengeStatus = "pending" | "confirmed" | "denied" | "expired" | "cancelled";

export function statusWord(status: string): "Pending" | "Confirmed" | "Could not verify" {
  if (status === "confirmed") return "Confirmed";
  if (status === "pending") return "Pending";
  return "Could not verify";
}

export function statusReason(status: string) {
  switch (status) {
    case "pending":
      return "Waiting for a passkey answer. This is not a confirmation.";
    case "confirmed":
      return "They used their passkey before it expired. This does not mean they are safe, and it does not make a payment legitimate.";
    case "denied":
      return "They denied this request. Halo did not confirm it.";
    case "expired":
      return "The time ran out before a passkey answer. Halo did not confirm it.";
    case "cancelled":
      return "This check was cancelled before anyone answered.";
    default:
      return "Halo could not verify this request.";
  }
}
