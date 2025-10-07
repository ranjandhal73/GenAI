import "dotenv/config";
import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";

const getCurrentTime = tool({
  name: "get_current_time",
  description: "It returns the current time of the local area.",
  parameters: z.object({}),
  async execute() {
    return new Date().toString();
  },
});

const getMenu = tool({
  name: "get_menu",
  description: "Fetches and returns the menu items",
  parameters: z.object({}),
  async execute() {
    return {
      Dinner: {
        Chicken: "INR 300",
        Mutton: "INR 499",
        Fish: "INR 250",
      },
      Lunch: {
        Chicken: "INR 300",
        Mutton: "INR 499",
        Fish: "INR 250",
      },
      Breakfast: {
        Chicken: "INR 300",
        Mutton: "INR 499",
        Fish: "INR 250",
      },
    };
  },
});

const cookingAgent = new Agent({
  name: "Cooking agent",
  instructions:
    "You are a helpful assistant who help the user to make the receipe",
  tools: [getCurrentTime, getMenu],
});

const codingAgent = new Agent({
  name: "Coding Agent",
  instructions:
    "You are an expert coding assistant particullary in JavaScript",
});

const gatewayAgent = Agent.create({
    name: 'gateway_agent',
    instructions: 'You determine which agent to use',
    handoffs: [codingAgent, cookingAgent],
})
const userQuery =
  "How to create a project in Python?";

const chatWithAgent = async (userQuery) => {
  const result = await run(gatewayAgent, userQuery);
  // const result = await run(gatewayAgent, userQuery);
  console.log("Results of Agent SDK:", result.history);
  console.log("Last agent used:",result.lastAgent);
  console.log("Results of Agent SDK:", result.finalOutput);
};

await chatWithAgent(userQuery);
