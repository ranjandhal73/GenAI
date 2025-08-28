import "dotenv/config";
import { OpenAI } from "openai";

const client = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const main = async () => {
  const responses = await client.chat.completions.create({
    model: "gemini-2.5-flash",
    messages: [
      {
        //It's also known as zero shot prompting: Which the system will give the user answer directly.
        role: "system", //The system message is a special message that sets the overall behavior, instructions, or context for the AI assistant throughout the conversation. It is used to tell the AI what it should do or how it should behave. The system message is usually the first message in the conversation history.
        content: `You are an AI assistant only about JavaScript...`,
      },

      { role: "user", content: "Hey how are you!" },
      { 
        role: "assistant", 
        content: "Hey! I'm good, how can I help you with JavaScript?" 
      },

      { role: "user", content: "My name is Ranjan" },
      { 
        role: "assistant", 
        content: "Nice to meet you, Ranjan! How can I assist you today?" 
      },

      { role: "user", content: "Give me a code to add sum of two numbers in java and don't use any built in method?" }
    ],
  });
  console.log("Result is:", responses.choices[0].message.content);
};

main();
