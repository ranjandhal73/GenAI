import 'dotenv/config'
import { Agent, run, tool } from '@openai/agents';

// lets assume it comes from a DB and let's assume the thread key word as 'database'
let thread = []
const customerSupportAgent = new Agent({
    name: "Customer Support Agent",
    instructions: `
    You're a helpful assistant who help the customers as per their query.
    `,
})

const runAgentWithQuery = async (query = '') => {
    const result = await run(
        customerSupportAgent, 
        thread.concat({ role: 'user', content: query})
    );
    thread = result.history;
    console.log("Thread is:", thread)
    console.log("Reuslt:", result.finalOutput)
}

runAgentWithQuery('Hi, My Name is Ranjan?')
.then(()=>{
    runAgentWithQuery("What is My name?")
});