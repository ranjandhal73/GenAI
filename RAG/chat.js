import dotenv from 'dotenv'
import { OpenAIEmbeddings } from "@langchain/openai"
import { QdrantVectorStore } from "@langchain/qdrant"
import OpenAI from "openai"
import { fileURLToPath } from "url"
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: path.resolve(__dirname, "../.env")})
const client = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: process.env.PERPLEXITY_BASE_URL
})
const chat = async () => {
    // const userQuery = 'How to make http request from node js?'
    const userQuery = 'How to add two numbers in python?'
    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-large"
    })

    const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
        url: 'http://localhost:6333',
        collectionName: "langchaninjs-testing"
    });

    const vectorRetriver = vectorStore.asRetriever({
        k: 3
    });

    const relevantChunks = await vectorRetriver.invoke(userQuery); 

    const SYSTEM_PROMPT = `
        You're a/an AI assistant who helps user, by resolving their query based on the context available 
        to you from a PDF file with the content and page number.

        Only gives answer based on the available contect from files only. 

        Always gives the page number or source where you gave the answer to the user.
        
        Context: 
        ${JSON.stringify(relevantChunks)}
    `
    const response = await client.chat.completions.create({
        model: "sonar",
        messages: [
            {role: "system", content:  SYSTEM_PROMPT},
            {role: "user", content: userQuery},
        ]
    })

    console.log(`🫁: ${response.choices[0].message.content}`);
};

chat();