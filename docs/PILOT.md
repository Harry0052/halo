# Halo pilot plan

This plan has not been run. No decision to ship, iterate, or stop has been made from observed use. The notes below are the plan, not results.

## Who

Ten to thirty people who already know each other, in a few families or friend groups. They are not a random public launch. Do not recruit by implying that Halo makes a payment safe.

## What they are asked to do

1. Open Halo at a hostname that can use passkeys, save the name people already use, and add one person with the invite link.
2. Invent a suspicious request they might actually receive, without typing a card number, and ask that person to confirm it.
3. The other person compares the code and answers with a passkey, either confirm or deny.
4. Both people say, in their own words, what they think the result means.
5. A few days later, see whether anyone starts a second check without being asked.

## What to record

- Did both people finish the check?
- Did anyone describe Confirmed as "the payment is safe" or "they are safe"? That is the early invalidation signal from the product brief. If that misunderstanding shows up more than once, change the words before any wider release.
- Did anyone come back and start another check?
- Did anyone get stuck on the passkey prompt, the invite link, or the expiry?
- Counts on Safety are only that person's confirmed checks. Do not publish them as a success metric for the product.

## What not to do

- Do not turn on email, SMS, or push for the pilot. Those deliveries are not built.
- Do not tell participants the result is identity proof.
- Do not treat this document as evidence that the pilot happened.

## Decision, after there is evidence

Ship only if people can finish a real check and they do not treat Confirmed as proof that a transfer is safe.

Iterate if the task is completable but the words or the passkey step confuse people.

Stop if people consistently treat a passkey answer as a guarantee about safety or money, and a wording change does not fix that.
