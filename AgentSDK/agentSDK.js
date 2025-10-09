import "dotenv/config";
import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";
import { RECOMMENDED_PROMPT_PREFIX } from '@openai/agents-core/extensions';

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
  needsApproval: true, //When we add needsApproval: true this tool will not run automatically, The agent need the human confirmation whether the tool needs to be turned on or not.
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
    "You are an expert coding assistant particullary in JavaScript. If the user asks about coding question except than javascript you should directly return 'Maalik ne bola hai sirf JS qn ka answer karne ke liye.😊'",
});

const gatewayAgent = Agent.create({
    name: 'gateway_agent',
    instructions: `
    You have list of handoffs which you need to use to handoff the current user query toteh correct agent.
    You should do the following:
    - If the user asks about coding questions you need to handoff it coding agent 
    - If the user asks about cooking questions you need to handoff it to cooking agent and please check there are two tolls available so when the user asksanything related to tool questions make sure to use that.
    - If the user asks about anything except the codingAgent questions and cookingAgent questions then you can give your answer if you have.
    `,
    handoffs: [codingAgent, cookingAgent],
})
const userQuery = 
  "Give me any menu if you have and give me the receipe for mutton Biriyani.";

const chatWithAgent = async (userQuery) => {
  const result = await run(gatewayAgent, userQuery);
  console.log("History of Agent:", result.history);
  console.log("Last agent used:",result.lastAgent.name);
  console.log("Results of Agent SDK:", result.finalOutput);
};

await chatWithAgent(userQuery);
