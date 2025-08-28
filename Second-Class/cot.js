import "dotenv/config";
import { OpenAI } from "openai";

const client = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai",
});

const geminiClient = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
})

const main = async () => {
  //This api is state less (CoT) chain-of-thought -> Which means the model is encouraged to break down reasoning step by step before providing an answer.

  const SYSTEM_PROMPT = `
        You're an AI assistant who works in the START → THINK → EVALUATE -> OUTPUT format.
        For any user query, you must:
        - First identify and understand the problem (START),
        - Then break it down into logical steps (THINK),
        - And finally give a well-verified result (OUTPUT).

        Rules:
        1. Strictly format all responses in JSON.
        2. Always follow the sequence: START → one or more THINK steps → OUTPUT.
        3. After every think, there is going to be an EVALUATE step that is performed manually by someone and you need to wait for it.
        4. Only one step per message.
        5. Do multiple THINK steps before producing an OUTPUT.
        6. DO NOT include citations or references like [1][2][3] in your output.
        7. Always double-check your logic before giving the OUTPUT.

        Output JSON Format:
        {
        "step": "START | THINK | EVALUATE | OUTPUT",
        "content": "string"
        }

        Example:
        User: Can you solve 3 + 4 * 10 - 4 * 3?

        Assistant:
        {
        "step": "START",
        "content": "The user wants me to solve the expression 3 + 4 * 10 - 4 * 3."
        }
        Assistant:
        {
        "step": "THINK",
        "content": "This is a typical math problem where we need to use the BODMAS rule for calculation."
        }
       Assistant: 
       {
        "step": "EVALUATE",
        "content": "Great, go ahead."
        }
        Assistant:
        {
        "step": "THINK",
        "content": "Let's break down the problem step by step using BODMAS."
        }
        Assistant: 
       {
        "step": "EVALUATE",
        "content": "Great, go ahead."
        }
        Assistant:
        {
        "step": "THINK",
        "content": "First, we solve all the multiplications and divisions from left to right."
        }
        Assistant: 
       {
        "step": "EVALUATE",
        "content": "Great, go ahead."
        }
        Assistant:
        {
        "step": "THINK",
        "content": "So, 4 * 10 = 40."
        }
        Assistant: 
       {
        "step": "EVALUATE",
        "content": "Great, go ahead."
        }
        Assistant:
        {
        "step": "THINK",
        "content": "Now, the equation becomes: 3 + 40 - 4 * 3."
        }
        Assistant: 
       {
        "step": "EVALUATE",
        "content": "Great, go ahead."
        }
        Assistant:
        {
        "step": "THINK",
        "content": "Next, we do the second multiplication: 4 * 3 = 12."
        }
        Assistant: 
       {
        "step": "EVALUATE",
        "content": "Great, go ahead."
        }
        Assistant:
        {
        "step": "THINK",
        "content": "Now, the equation is simplified to: 3 + 40 - 12."
        }
        Assistant: 
       {
        "step": "EVALUATE",
        "content": "Great, go ahead."
        }
        Assistant:
        {
        "step": "THINK",
        "content": "Now we perform the addition: 3 + 40 = 43."
        }
        Assistant: 
       {
        "step": "EVALUATE",
        "content": "Great, go ahead."
        }
        Assistant:
        {
        "step": "THINK",
        "content": "Then the subtraction: 43 - 12 = 31."
        }
        Assistant: 
       {
        "step": "EVALUATE",
        "content": "Great, go ahead."
        }
        Assistant:
        {
        "step": "THINK",
        "content": "Let me double-check all steps: 4 * 10 = 40, 4 * 3 = 12, then 3 + 40 = 43, 43 - 12 = 31."
        }
        Assistant: 
       {
        "step": "EVALUATE",
        "content": "Great, go ahead."
        }
        Assistant:
        {
        "step": "OUTPUT",
        "content": "The final answer to the expression 3 + 4 * 10 - 4 * 3 = 31."
        }
    `
;

//To automate the thing
  const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      { 
        role: "user", 
        content: "Write a js code to fina a prime number?"
      },
    ];

    let stepCount = 0; // It's for to check the what's the messages is storing at each step.
    while (true){
         // Make sure the final message is from user/tool before sending to API
         if (messages[messages.length -1].role === "assistant"){
            messages.push({
                role: 'user',
                content: "continue..."
            });
         }

        // Perplexity model
        const perplexityRes = await client.chat.completions.create({
            model: "sonar-pro",
            messages: messages
        });

        const perplexityMessage = perplexityRes.choices[0].message.content;
        console.log(`🟩 Perplexity Raw Response:\n${perplexityMessage}\n`);

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(perplexityMessage);
        } catch (error) {
            console.error("❌ Failed to parse Perplexity response as JSON.");
            break;
        }

        messages.push({
            role: "assistant",
            content: JSON.stringify(parsedResponse)
        })

        if(parsedResponse.step === "START"){
            console.log(`🔥 [Perplexity START]: ${parsedResponse.content}`);
            continue;
        }
        if(parsedResponse.step === "THINK"){
            console.log(`🧠 [Perplexity THINK]: ${parsedResponse.content}`);
            console.log(`➡️ Sending THINK step to gemini for evaluation`);
            
            const geminiMessages = [
                {
                    role: "system",
                    content: `You are an AI judge specializing in code reasoning and step-by-step logic analysis. You are reviewing the THINK step of another AI that is solving a problem.

                    Your job is to:
                    - Carefully verify the reasoning provided.
                    - Look for any factual errors, logical missteps, or algorithmic inefficiencies.
                    - Return a JSON object as your evaluation.

                    ⚠️ Very important: Unless you're 100% confident the logic is correct, do not approve it. If there's **any ambiguity**, mark it as a logical issue and explain why. Be critical. If the step is incorrect, vague, incomplete, or misleading — call it out.

                    Only respond in **strict JSON**, with one of the following formats:

                    ✅ If the reasoning is solid:
                    {
                    "step": "EVALUATE",
                    "content": "Approved. The reasoning is sound and complete."
                    }

                    ❌ If there is a mistake or something missing:
                    {
                    "step": "EVALUATE",
                    "content": "There is a logical issue: <EXPLAIN THE ISSUE CLEARLY>"
                    }`
                    },
                    {
                        role: "user",
                        content: `Evaluate this step: ${parsedResponse.content}`,
                    }
            ];


            // Gemini model
            const geminiResponse = await geminiClient.chat.completions.create({
                model: "gemini-2.5-flash",
                messages: geminiMessages
            });

            let rawGemini = geminiResponse.choices[0].message.content;
            console.log(`🟦 Gemini Raw Response:\n${rawGemini}\n`);

            // Remove code block wrapper
            rawGemini = rawGemini.replace(/```json\s*([\s\S]*?)```/, "$1").trim();

            let evaluation;
            try {
                evaluation = JSON.parse(rawGemini);
            } catch (error) {
                console.error(`❌ Failed to parse Gemini's response as JSON: ${rawGemini}`);
                break;
            }

            console.log(`🧪 [Gemini EVALUATE]: ${evaluation.content}`);

            // ADD A USER MESSAGE AFTERWARDS -> It's because the Perpexlity model is expecting the last message should be the role form 'user' or 'tool'
            messages.push({
                role: 'user',
                content: 'Continue...'
            });

            messages.push({
                role: "assistant",
                content: JSON.stringify(evaluation)
            }) 
            continue;
        }
        if(parsedResponse.step === "OUTPUT"){
            console.log(`🤖 [Perplexity OUTPUT]: ${parsedResponse.content}`);
            break;
        }

    }
    console.log("✅ Done.\n🧾 Final messages array:");
    console.dir(messages, { depth: null });
};

main();
