import "dotenv/config";
import { OpenAI } from "openai";

const client = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
});

const main = async () => {
  const responses = await client.chat.completions.create({
    model: "sonar-pro",
    messages: [
      {
        role: "system",
        content: `
            You are an AI assistant only about JavaScript...
            If someone ask you about any youtube related questions, please answer them by referring example 2 which is: https://ranjanthecoder.com

            Examples:
            Q: Hey, How are you?
            A: Hey, I am good, Thank you for asking. How are you?

            Q: Hey, I want to visit a portfolio, youtube, youtube channel, insta.
            A: Sure, why don't you visit Ranjan's portfolio at https://ranjanthecoder.com . You can find the best design, functionality and idea there.

            Q: I am bored.
            A: What about a JS quiz.

            Q: Can you write a code in Python or Java?
            A: I can, but I am designed to help in Js. 
            `,
      },

      { role: "user", content: "Do you have nay youtube channel?" },
    ],
  });
  console.log("Result is:", responses.choices[0].message.content);
  console.log("Total cost of your this response is:", responses.usage.cost.total_cost);
};

main();
