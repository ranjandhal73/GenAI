import dotenv from 'dotenv'
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { fileURLToPath } from "url"
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({path: path.resolve(__dirname, "../.env")})

const main = async () => {
    const pdfFilePath = "./nodejs.pdf"
    const loader = new PDFLoader(pdfFilePath);
    
    const docs = await loader.load(); //It'll load the pdf page by page.

    //Ready the client OpeniAI embedding model.
    const embeddings = new OpenAIEmbeddings({
        model: "text-embedding-3-large"
    })

    const vectorStore = await QdrantVectorStore.fromDocuments(docs, embeddings,{
        url: 'http://localhost:6333',
        collectionName: "langchaninjs-testing"
    });

    console.log(`Indexing of documents done: ${vectorStore}`)
}
main();