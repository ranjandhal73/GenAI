# GenAI

GenAI is a Node.js project showcasing Self-Consistency prompting for AI language models. Instead of relying on a single chain of thought, this approach generates multiple answers to the same question, then picks the most consistent one by majority voting. This method helps improve the reliability and accuracy of AI-generated solutions.

## Features

- Generates multiple reasoning paths with diversity (via temperature control)
- Extracts and compares final answers
- Selects the most consistent answer using majority voting
- Easy to customize for different selection strategies

## Getting Started

1. Clone the repo
2. Add your API key to a `.env` file as `PERPLEXITY_API_KEY=your_key_here`
3. Run the script with `node self_consistency.js`

## Why Self-Consistency?

Traditional chain-of-thought prompting produces one reasoning path that may be flawed or incomplete. Self-Consistency generates multiple independent answers and picks the one that appears most often, increasing confidence in the final output.

---

Feel free to tweak and expand this based on your preferences! Want me to help write a longer or more technical README too?
