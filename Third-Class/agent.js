import "dotenv/config";
import { OpenAI } from "openai";
import axios from "axios";
import {exec} from "child_process";
import fs from "fs/promises";
import path from "path";

const getWeatherDetailsByCity = async (cityname = '') => {
  const url = `https://wttr.in/${cityname.toLowerCase()}?format=%C+%t`;
  const { data } = await axios.get(url, { responseType: 'text' });
  return `The current weather of ${cityname} is ${data}`;
};

const getGithubUserInfoByUsername = async (username = '') => {
  const url = `https://api.github.com/users/${username.toLowerCase()}`;
  const { data } = await axios.get(url);
  return JSON.stringify({
    name: data? data.name : 'User has no name',
    email: data? data.email : 'User has no name',
    login: data?.login,
    followers: data?.followers
  });
}

const executeCommandForLinuxAndMac = async (cmd = '') => {
  return new Promise((res, rej)=>{
    exec(cmd, (err, data)=>{
      if(err){
        return res(`Error running command ${err}`);
      }else{
        return res(data);
      }
    })
  })
}

const executeCommandForWindows = async (cmd = '') => {
  try {
    // Extract content from labeled sections using regex
    const htmlMatch = cmd.match(/HTML:\s*([\s\S]*?)\s*(?=CSS:|$)/i);
    const cssMatch = cmd.match(/CSS:\s*([\s\S]*?)\s*(?=JS:|$)/i);
    const jsMatch = cmd.match(/JS:\s*([\s\S]*)/i);

    if (!htmlMatch || !cssMatch || !jsMatch) {
      return "Error: Could not parse HTML, CSS or JS sections from input text.";
    }

    const html = htmlMatch[1].trim();
    const css = cssMatch[1].trim();
    const js = jsMatch[1].trim();

    const folderPath = path.join(process.cwd(), "todo_app");
    await fs.mkdir(folderPath, { recursive: true });

    await fs.writeFile(path.join(folderPath, "index.html"), html);
    await fs.writeFile(path.join(folderPath, "style.css"), css);
    await fs.writeFile(path.join(folderPath, "script.js"), js);

    return "todo_app folder and files created successfully.";
  } catch (error) {
    return `Error creating files: ${error.message}`;
  }
};


const TOOL_MAP = {
  getWeatherDetailsByCity: getWeatherDetailsByCity,
  getGithubUserInfoByUsername: getGithubUserInfoByUsername,
  executeCommandForLinuxAndMac: executeCommandForLinuxAndMac,
  executeCommandForWindows: executeCommandForWindows
};

const client = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: process.env.PERPLEXITY_BASE_URL,
});

function extractJsonObjects(str) {
  // Regex to match all JSON objects in the string
  const regex = /{[^{}]*}/g;
  return str.match(regex) || [];
}

const main = async () => {
  const SYSTEM_PROMPT = `
  You're an AI assistant who works in the START → THINK → OBSERVE → OUTPUT format.
  For any user query, you must:
  - First identify and understand the problem (START),
  - Then break it down into logical steps (THINK),
  - For weather-related queries ONLY, you must call the available tool with TOOL step before producing OUTPUT.
  - For non-weather queries, you can go directly from THINK to OUTPUT without using tools.
  - Wait for the OBSERVATION from the tool (the response from the tool) only when you make a tool call.
  - The user might ask question for more than one city and you need to observer before giving the output that means you need to ensure that all of the cities weather has been generated.
  - If the user's machine is Linux or Mac then follow executeCommandForLinuxAndMac.
  - If the user's machine is window then follow executeCommandForWindows
  
  Available Tools:
  - getWeatherDetailsByCity(cityname: string) -> Returns the current weather data of the user's query city.
  - getGithubUserInfoByUsername(username: string) -> Returns the public information about the publiac API using Gituhub API.
  - executeCommandForLinuxAndMac(cmd: string) -> Executes Unix/Linux shell commands.
  - executeCommandForWindows(cmd: string) -> tool to accept that plain text and parse out the HTML, CSS, and JS content from it before writing files.


  Rules:
  1. Strictly format all responses in JSON.
  2. For WEATHER queries: Follow START → THINK → TOOL → OBSERVE → OUTPUT sequence.
  3. For NON-WEATHER queries: Follow START → THINK → OUTPUT sequence.
  4. Only one step per message.
  5. Do multiple THINK steps before producing an OUTPUT.
  6. DO NOT include citations or references in your output.
  7. Always double-check your logic before giving OUTPUT.
  8. MANDATORY: For weather-related queries, you MUST generate a TOOL step before OUTPUT. Never skip the tool for weather questions.
  9. For general questions (like name, greetings, non-weather topics), you can answer directly without tools.

  Output JSON Format:
  {
    "step": "START | THINK | TOOL | OBSERVE | OUTPUT",
    "content": "string",
    "tool_name": "string",
    "input": "string"
  }
    Example:
    User: Hey, can you tell me weather of Patiala?
    ASSISTANT: { "step": "START", "content": "The user is intertested in the current weather details about Patiala" } 
    ASSISTANT: { "step": "THINK", "content": "Let me see if there is any available tool for this query" } 
    ASSISTANT: { "step": "THINK", "content": "I see that there is a tool available getWeatherDetailsByCity which returns current weather data" } 
    ASSISTANT: { "step": "THINK", "content": "I need to call getWeatherDetailsByCity for city patiala to get weather details" }
    ASSISTANT: { "step": "TOOL", "input": "patiala", "tool_name": "getWeatherDetailsByCity" }
    DEVELOPER: { "step": "OBSERVE", "content": "The weather of patiala is cloudy with 27 Cel" }
    ASSISTANT: { "step": "THINK", "content": "Great, I got the weather details of Patiala" }
    ASSISTANT: { "step": "OUTPUT", "content": "The weather in Patiala is 27 C with little cloud. Please make sure to carry an umbrella with you. ☔️" }
  `;

  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: "Give me the details of the full github profile you have of user: ranjandhal73. "
    },
  ];

  while (true) {
    if (messages[messages.length - 1].role === "assistant") {
      messages.push({
        role: 'user',
        content: "continue..."
      });
    }

    const perplexityRes = await client.chat.completions.create({
      model: "sonar",
      messages: messages
    });

    const perplexityMessage = perplexityRes.choices[0].message.content;
    // console.log(`🟩 Perplexity Raw Response:\n${perplexityMessage}\n`);

    const jsonObjects = extractJsonObjects(perplexityMessage);

    if (!jsonObjects.length) {
      console.error("❌ No valid JSON found in response.");
      break;
    }

    for (const objString of jsonObjects) {
      // console.log(`⭕ Object strings are: ${objString}`)
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(objString);
      } catch (error) {
        console.error("❌ Failed to parse JSON segment:", objString);
        continue;
      }

      messages.push({
        role: "assistant",
        content: JSON.stringify(parsedResponse)
      });

      if (parsedResponse.step === "START") {
        console.log(`🔥 [Perplexity START]: ${parsedResponse.content}`);
        continue;
      }
      if (parsedResponse.step === "THINK") {
        console.log(`🧠 [Perplexity THINK]: ${parsedResponse.content}`);
        continue;
      }

      if (parsedResponse.step === "TOOL") {
        const toolToCall = parsedResponse.tool_name;
        if (!TOOL_MAP[toolToCall]) {
          messages.push({
            role: "developer",
            content: `There is no such tool as ${toolToCall}`
          });
          continue;
        }

        const resFromTool = await TOOL_MAP[toolToCall](parsedResponse.input);
        console.log(`🔮${toolToCall} Call and input 🔠 ${parsedResponse.input} and output: ${resFromTool}`);
        messages.push({
          role: "assistant",
          content: JSON.stringify({
            step: "OBSERVE",
            content: resFromTool
          })
        });
      }

      if (parsedResponse.step === "OUTPUT") {
        console.log(`🤖 [Perplexity OUTPUT]: ${parsedResponse.content}`);
        break;
      }
    }

    if (jsonObjects.some(objStr => {
      try {
        const resp = JSON.parse(objStr);
        return resp.step === "OUTPUT";
      } catch { return false; }
    })) break;
  }

  console.log("✅ Done.\n🧾 Final messages array:");
  // console.dir(messages, { depth: null });
};

main();
