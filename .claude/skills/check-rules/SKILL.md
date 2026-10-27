---
name: check-rules
description: Answer a Battle for Biternia rules question from the rulebook and confirmed card text, with page citations, paste-ready Rules bullets and automation notes. Runs in its own context via the rules-lawyer agent. Use when the user invokes /check-rules or asks what the rules say about a token, status, phase, setup, respawn or hero ability.
argument-hint: <rules question(s)>
context: fork
agent: rules-lawyer
---

Answer these Battle for Biternia rules questions:

$ARGUMENTS

If no question was given, reply only: "Usage: /check-rules <question>, e.g. /check-rules does Chill
stack?"
