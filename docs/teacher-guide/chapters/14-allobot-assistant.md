# AlloBot: the assistant that talks with you

AlloBot is AlloFlow's built-in assistant. You can type to it or talk to it, ask questions about your lesson, or ask it to do things in the app. As of the August 2026 update, conversation comes first: you can speak to it naturally, and it will never scold you for not using a command.

If you are new to AlloFlow, read [Start here](01-start-here.md) first. AlloBot helps most once you have a lesson to talk about.

## How talking to it works

When hands-free mode is listening, everything you say lands in one of three buckets:

| What you said | What happens |
| --- | --- |
| Ordinary speech ("what should I add for my striving readers?") | AlloBot answers in conversation, out loud. There is no wrong thing to say. |
| Something that sounds like an action ("build a lesson", "open the glossary") | AlloBot **offers** first: it says what it could do and waits for your yes. Keep talking instead, and the offer quietly goes away. |
| A quick, harmless action ("bigger text", "stop reading") | It just does it. |

The offer step exists because a command that yanks you to a different screen mid-thought is worse than no command. Nothing that changes what is on screen runs without your yes.

**The shortcut for people who know the commands:** say "command" before a phrase ("command open the learning hub") and it acts immediately, no offer.

## Knowing the microphone's state

The voice indicator always tells you, in text as well as color, which state it is in: Listening, Paused, Thinking, or Speaking. A small level meter shows your own voice being picked up, so you are never left wondering whether the microphone hears you. All of it is announced to screen readers.

## Hiding AlloBot does not silence the app

The X on the bot and the header toggle do the same thing: they hide AlloBot and its tips. Nothing else. Read-aloud, narration, and any speech you ask for keep working with the bot hidden.

## What gets sent where

A spoken question goes to the configured AI backend under the same provider settings used for generation. AlloBot does not listen when hands-free mode is off, and the microphone closes while it speaks or thinks (the indicator says so). If no AI backend is set up, AlloBot's AI conversation is unavailable; see [Troubleshooting](08-troubleshooting.md) for the connection routes available in your deployment.

## Practical guidance

- **Let new users just talk.** The most common mistake is treating AlloBot like a command line. It is a colleague, not a console.
- **During a lesson**, "stop reading" and the read-aloud transport are direct controls rather than proposed screen changes. They should respond promptly; if audio continues, use the visible stop or mute control and follow the audio recovery steps in [Troubleshooting](08-troubleshooting.md).
- **In Guided Mode**, AlloBot knows which step you are on, so "where was I?" is a fair question.
