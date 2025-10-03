import 'dotenv/config'
import { ChatOpenAI } from '@langchain/openai'
import { StateGraph, Annotation, MessagesAnnotation } from '@langchain/langgraph';
import { z } from "zod"
import { HumanMessage, AIMessage } from '@langchain/core/messages';

// const GraphAnnotation = Annotation.Root({
//     messages: Annotation({
//         reducer: (x, y) => x.concat(y),
//         default: () => {}
//     })
// });

const llm = new ChatOpenAI({
    model: "gpt-4.1-mini"
})

async function callOpenAI (state) {
    console.log("Inside callOpenAI", state);
    const response = await llm.invoke(state.messages);
    return {
        messages: [response]
    }
}

// async function runAfterCallOpenAI(state){
//     console.log("State inside runAfterCallOpenAI:",state);
//     return {
//         messages: ["Returned a new state inside: runAfterCallOpenAI"]
//     }
// };

const workflow = new StateGraph(MessagesAnnotation)
.addNode('callOpenAI', callOpenAI)
.addEdge("__start__", 'callOpenAI')
.addEdge("callOpenAI", "__end__");

const graph = workflow.compile();

const runGraph = async () => {
    const userQuery = "Hey, How are you"
    const result = await graph.invoke({ messages: [new HumanMessage(userQuery)]});
    console.log("State after invoiking the graph:", result.messages)
}

runGraph(); 