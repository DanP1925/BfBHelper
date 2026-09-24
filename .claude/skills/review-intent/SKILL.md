---
name: review-intent
description: Grill the user with batched, frontier-based questions to resolve open decisions in intent.md, then fold the answers into intent.md. Use when the user asks to review, refine, flesh out, or "grill" intent.md, or invokes /review-intent.
---

# Review Intent

Turn whatever's vague or undecided in `intent.md` into concrete, committed
decisions, through short batched rounds of questions — not one giant
open-ended "what do you want" prompt, and not one question at a time.

Optional argument: a topic or area to focus on (e.g. `/review-intent
hosting`). If given, scope the design tree to that area instead of the
whole document.

## The technique

1. **Read the current state.** Read `intent.md`, plus anything else
   needed to understand what's already been decided (recent git
   history/diff on it is often useful context for what just changed and
   why).

2. **Build a design tree.** Identify every decision still needed to
   sharpen the intent — product/UX behavior, scope boundaries, edge
   cases the doc is silent on. Stay at the product/business altitude
   that `intent.md` already lives at: what users experience, what the
   app guarantees, what's in vs. out of scope. Technical/architecture
   decisions (stack, hosting, protocols, storage engine) are out of
   scope for this skill by default — don't go down that branch unless
   the user explicitly steers there.

3. **Find the frontier.** The frontier is every decision whose
   prerequisites are already settled by the doc or by answers given so
   far — the only questions that can honestly be asked *right now*.
   Don't ask a question whose answer would depend on something not yet
   decided; wait for the round that unlocks it.

4. **Ask the frontier as one batched round.** Two questions never share a
   round if one depends on the other, but everything else that's
   currently askable goes in together. Format each question:

   ```
   ❓ **N. Title**
   Body: the tradeoff, in plain language — what the options are and what
   each implies. If a term might not be familiar, explain it in-line
   rather than assuming it.
   ➡️ Your recommended answer, with a one-line reason.
   ```

   Tell the user they can answer in shorthand (e.g. "1 a, 2 yes, 3 no").

5. **Process answers, open the next round.** Each answer may settle
   prerequisites that unlock new frontier questions — ask those next,
   nothing further out. If an answer changes something previously
   settled, or introduces a new branch (like "I want to learn AWS"
   reshaping the hosting decisions), fold that in rather than plowing
   ahead with stale recommendations.

6. **If the user doesn't understand a question, don't repeat it louder.**
   Re-explain in plainer terms, with an analogy if useful, or as a
   simple two-option choice instead of three jargon-laden ones. If a
   detail genuinely doesn't matter to them, offer to just apply the
   recommendation and move on.

7. **The user owns the scope.** Push back gently if a question seems to
   be getting insufficient thought (a real one-word answer to a
   multi-part tradeoff), but their call is their call — don't re-argue a
   settled answer in a later round.

8. **Stop when the frontier is empty.** Summarize every decision made in
   the session, grouped sensibly (not just a flat list in question
   order), and ask the user to confirm it matches what they meant before
   writing anything to disk. Do not edit files until they confirm.

## Writing the result

Once confirmed, fold every decision into `intent.md` alone. Edit it with
the same tone and structure it already has — don't rewrite unrelated
sections, and don't add a "Decisions" meta-section; fold each decision
into the existing section it belongs under (adding a new section only
if nothing existing fits).

Do **not** create or update `spec.md` (or any other file) as part of
this skill's normal behavior, even if technical questions come up along
the way — only do that if the user explicitly asks for it in the
session, as a one-off, separate from this skill's job.

After writing, tell the user what changed in `intent.md` in a couple of
sentences — don't restate the full summary again.
