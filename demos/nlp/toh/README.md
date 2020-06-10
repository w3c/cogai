# Towers of Hanoi Demo

* https://www.w3.org/Data/demos/chunks/nlp/toh/

This is a very simple demo on natural language processing that allows you to move discs between pegs in the game known as the "Towers of Hanoi". You can only move discs that are at the top of the pile for each peg. 

You can enter commands like the following:

```
move the red disc to the right peg
move the green disc to the middle peg
move the red disc to the middle peg
move the blue disc to the right peg
move the red disc to the left peg
move the green disc to the right peg
move the red disc to the right peg
```
Hit the enter key to parse and execute the command.

On Chrome you can also try speaking the command by clicking/tapping the microphone button, then speaking, and then waiting for the result, and **if** it looks okay, hit the Enter key to parse and execute it.  On most browsers, speech synthesis is used to speak error messages, e.g. for illegal moves, and for unknown words.

## Explanation

Natural language understanding (NLU) is modelled as a combination of parsing plus asynchronous cognitive reasoning. The demo ignores punctuation and upper/lower case distinctions, simulating hearing. This is motivated by the observation that spoken language evolved a million years before written language. 

The vocabulary for this demo, whilst small, includes a determiner (the), adjectives (red, green, blue, left, middle, right), nouns (disc, peg), preposition (to) and verb (move).

As an example, the utterance "move the red disc to the right peg" is mapped incrementally word by word to the following word graph:

```
verb v1 {word move; subject p1; to p2}
np p1 {noun disc; det the; adj red}
np p2 {noun peg; det the; adj right}
```

The parser the invokes the rule engine to interpret the word graph as:

```
move m1 {disc disc3; from peg1; to peg3}
```

Future demos will switch to concurrent processing of syntax and semantics, as is necessary to resolve the abundant ambiguity in natural language.
