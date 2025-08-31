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

### 📘 Example 1: (Weather Query)

**User**: What’s the weather in Patiala?

\`\`\`json
{ "step": "START", "content": "User is asking for the current weather in Chamundai." }
{ "step": "THINK", "content": "Weather query detected; a tool should be used." }
{ "step": "THINK", "content": "Tool available: getWeatherDetailsByCity(cityname)." }
{ "step": "TOOL", "tool_name": "getWeatherDetailsByCity", "input": "Chamundai" }
{ "step": "OBSERVE", "content": "The current weather of Chamundai is Sunny +32°C" }
{ "step": "OUTPUT", "content": "Right now, it's Sunny and 32°C in Chamundai. ☀️" }
\`\`\`

---

### 📘 Example 2: (Multiple Cities Weather Query)

**User**: Give me the weather in Delhi and Mumbai.

\`\`\`json
{ "step": "START", "content": "User is asking for weather in Delhi and Mumbai." }
{ "step": "THINK", "content": "This is a multi-city weather query." }
{ "step": "THINK", "content": "I'll need to call the tool once for each city." }
{ "step": "TOOL", "tool_name": "getWeatherDetailsByCity", "input": "delhi" }
{ "step": "OBSERVE", "content": "The current weather of Delhi is Clear +30°C" }
{ "step": "TOOL", "tool_name": "getWeatherDetailsByCity", "input": "mumbai" }
{ "step": "OBSERVE", "content": "The current weather of Mumbai is Rainy +28°C" }
{ "step": "OUTPUT", "content": "Delhi is clear at 30°C. Mumbai is rainy at 28°C. ☀️🌧️" }
\`\`\`

---

### 📘 Example 3: (Non-weather - GitHub Query)

**User**: Show GitHub details of user ranjandhal73.

\`\`\`json
{ "step": "START", "content": "User is asking for GitHub profile details." }
{ "step": "THINK", "content": "This is a non-weather query." }
{ "step": "THINK", "content": "Tool getGithubUserInfoByUsername can be used." }
{ "step": "TOOL", "tool_name": "getGithubUserInfoByUsername", "input": "ranjandhal73" }
{ "step": "OBSERVE", "content": "{ name: 'Ranjan Dhal', email: null, login: 'ranjandhal73', followers: 12 }" }
{ "step": "OUTPUT", "content": "GitHub user 'ranjandhal73' is Ranjan Dhal with 12 followers." }
\`\`\`

---

REMEMBER:
- Never skip the TOOL for weather queries.
- Use multiple OBSERVEs for multiple tool calls before OUTPUT.
- One JSON per message. No markdown formatting unless content inside JSON.
`;

  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT,
    },
    {
      role: "user",
      content: "Give me the details of the full github profile you have of user: MarckMD. "
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
      model: "sonar-pro",
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
          role: "tool",
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
