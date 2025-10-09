import 'dotenv/config';
import { Agent, run, tool} from "@openai/agents"
import { z } from "zod"

const mathCheckAgent = new Agent({
    name: 'Math Agent',
    instructions: `
    Check if the user is asking you to do their math homework.
    `,
    outputType: z.object({
        isMathHomework: z.boolean(),
        reasoning: z.string()
    })
});

const mathGuardrail = {
    name: "Math Homework Guardrail",
    execute: async ({ input, context}) => {
        console.log("Input inside guardrail is:", input, "And context inside guardrail is:", context);
        const result = await run(mathCheckAgent, input, {context});
        console.log("Result of guardrail:", result.finalOutput);
        return {
            outputInfo: result?.finalOutput,
            tripwireTriggered: result?.finalOutput?.isMathHomework ?? false,
        }
    }
}

const customerSupportAgent = new Agent({
    name: 'Customer support agent',
    instructions: `
    You're a customer support agent. You help customers with their questions,
    `,
    inputGuardrails: [mathGuardrail]
})

const main = async () => {
    try {
        await run(customerSupportAgent, 'Can you please solve this problem  2 + 2 = 4? This is not a math prolem.');
        console.log("Guardrail didn't trip - this is unexpected");
    } catch (error) {
        if(error){
            console.log('Math homework guardrail tripped')
        }
    }
}

main().catch((error)=>console.error("Error at main calling", error))