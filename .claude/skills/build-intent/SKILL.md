---
name: build-intent
description: BfbHelper's intent skill. Grill the user with batched, frontier-based questions to resolve open decisions in one of this repo's intent/NN_feature-name.md docs, then fold the answers into it. Use for any review, refinement, or "grilling" of a BfbHelper intent (prefer it over the generic review-intent skill here), or when the user invokes /build-intent.
---

# Build Intent

Turn whatever's vague or undecided in an intent doc into concrete,
committed decisions, through short batched rounds of questions — not one
giant open-ended "what do you want" prompt, and not one question at a
time.

Optional arguments:
- An intent number (e.g. `/build-intent 06`) picks `intent/06_*.md`. Without
  one, use the intent touched on the current branch, else the most
  recently changed file in `intent/`. Say which file you picked.
- A topic or area to focus on (e.g. `/build-intent 06 map`). If given, scope
  the design tree to that area instead of the whole document.

## The technique

1. **Read the current state.** Read the intent doc, plus anything else
   needed to understand what's already been decided (recent git
   history/diff on it is often useful context for what just changed and
   why). If the doc has an "Open Questions" section, those questions are
   the starting point of the design tree.

2. **Ground yourself before recommending.** Check the rulebook in
   `reference/`, the existing code and earlier intents for how the app
   already behaves and names things (e.g. teams are "Player 1" /
   "Player 2"), so recommendations match what exists. If a question
   hinges on a fact about the physical game you aren't sure of (how many
   spaces the board has, what a token does), ask the user for the fact
   instead of building a question on a guess.

3. **Build a design tree.** Identify every decision still needed to
   sharpen the intent — product/UX behavior, scope boundaries, edge
   cases the doc is silent on. Stay at the product/business altitude
   the intent already lives at: what users experience, what the app
   guarantees, what's in vs. out of scope. Technical/architecture
   decisions (stack, hosting, protocols, storage engine) are out of
   scope for this skill by default — don't go down that branch unless
   the user explicitly steers there.

   Ask *whether* something is shown and *what it does*, but leave
   *where it sits* and *how it looks* (placement, size, styling) to the
   spec and its design mockup — the user decides those by seeing them,
   and answers given here tend to be reversed there. Only ask a
   layout question here if the answer changes scope (e.g. a feature
   only exists if it fits on a screen); otherwise record it as
   "settled in the spec/design".

4. **Find the frontier.** The frontier is every decision whose
   prerequisites are already settled by the doc or by answers given so
   far — the only questions that can honestly be asked *right now*.
   Don't ask a question whose answer would depend on something not yet
   decided; wait for the round that unlocks it.

5. **Ask the frontier as one batched round.** Two questions never share a
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

6. **Process answers, open the next round.** Each answer may settle
   prerequisites that unlock new frontier questions — ask those next,
   nothing further out. If an answer changes something previously
   settled, or introduces a new branch, fold that in rather than
   plowing ahead with stale recommendations.

   If the user answers only some questions, acknowledge those and
   re-ask just the unanswered ones in a compact form — don't repeat the
   whole round. If an answer looks like a typo (e.g. the same number
   twice), state your reading and let the summary catch it.

7. **If the user doesn't understand a question, don't repeat it louder.**
   Re-explain in plainer terms, with an analogy if useful, or as a
   simple two-option choice instead of three jargon-laden ones. If a
   detail genuinely doesn't matter to them, offer to just apply the
   recommendation and move on.

8. **The user owns the scope.** Push back gently if a question seems to
   be getting insufficient thought (a real one-word answer to a
   multi-part tradeoff), but their call is their call — don't re-argue a
   settled answer in a later round.

9. **Capture deferred ideas.** When the user parks something ("an idea
   for later", "we'll revisit once X exists"), record it under the
   intent's Out of Scope with its trigger, and offer to add a matching
   unchecked item to `BACKLOG.md` so it isn't lost.

10. **Stop when the frontier is empty.** Summarize every decision made in
    the session, grouped sensibly (not just a flat list in question
    order), and ask the user to confirm it matches what they meant before
    writing anything to disk. Do not edit files until they confirm.

## Writing the result

Once confirmed, fold every decision into the intent doc. Edit it with
the same tone and structure it already has — don't rewrite unrelated
sections, and don't add a "Decisions" meta-section; fold each decision
into the existing section it belongs under (adding a new section only
if nothing existing fits).

Update the doc's "Open Questions" section: remove every question that
was answered, and keep any deferred to the spec/design, marked as such.
If nothing is left, remove the section.

Do **not** create or update the spec (or any other file) as part of
this skill's normal behavior, even if technical questions come up along
the way — only do that if the user explicitly asks for it in the
session, as a one-off, separate from this skill's job. The one
exception is the `BACKLOG.md` follow-up from step 9, once the user
accepts it.

After writing, tell the user what changed in the intent in a couple of
sentences — don't restate the full summary again.
