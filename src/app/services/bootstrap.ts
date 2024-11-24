"use server"

import { NextResponse } from "next/server";
import { createIndexIfNeccessary, pineconeIndexHasVectors } from "./pincone";
import path from "path";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { error } from "console";
import {promises as fs } from "fs";
import { type Document } from "../types/document";


const readMetadata = async (): Promise<Document["metadata"][]> => {
    try {
        const filePath = path.resolve(process.cwd(), "docs/db.json");
        const data = await fs.readFile(filePath, "utf8");
        const parsed = JSON.parse(data);
        return parsed.documents || [];
    } catch (error) {
        console.warn("Could not read metadata from db.json:", error);
        return[];
    }
}
export const initiateBootStrapping = async(targetIndex: string) => {
    const baseURL = process.env.PRODUCTION_URL ? `https://${process.env.PRODUCTION_URL}` : `http://localhost:${process.env.PORT}`

    const response = await fetch(`${baseURL}/api/ingest`, {
        method:'POST',
        headers: {
            "Content-type": "application/json",
        },
        body : JSON.stringify({targetIndex}),
    });
    if(!response.ok){
        throw new Error(`API request failed with status ${response.status}`);
    }
}
const isValidContent = (content: string): boolean => {
    if (!content || typeof content !== "string") return false;
    const trimmed = content.trim();
    return trimmed.length > 0 && trimmed.length < 8192; // Voyage typically has a max token limit
  };
  

export const handleBootStrapping = async(targetIndex: string) => {
    try {
        `Running bootstrapping procedure against Pinecone index: ${targetIndex}`;

        await createIndexIfNeccessary(targetIndex)
        const hasVector = await pineconeIndexHasVectors(targetIndex);

        if (hasVector) {
            console.log(
                "Pinecone index already exist and has vectors in it - returning early"
            );
            return NextResponse.json({success: true }, { status: 200 });
        }

        console.log('loading documents and metadata....');


        const docsPath = path.resolve(process.cwd(), "docs/");
        const loader = new DirectoryLoader(docsPath, {
            ".pdf": (filePath : string) => new PDFLoader(filePath)
        })

        const documents = await loader.load();
        if (documents.length === 0 ){
            console.warn("No PDF documents found in docs directory");
            return NextResponse.json(
                {error: "No documents found" },
                {status: 400}
            )
        }
        const metadata = await readMetadata();

        const validDocuments = documents.filter((doc) =>
            isValidContent(doc.pageContent)
          );

          validDocuments.forEach((doc) => {
            const fileMetadata = metadata.find(
              (meta) => meta.filename === path.basename(doc.metadata.source)
            );
            if (fileMetadata) {
              doc.metadata = {
                ...doc.metadata,
                ...fileMetadata,
                pageContent: doc.pageContent,
              };
            }
          });

          console.log(`Found ${validDocuments.length} valid documents`);

          const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
          });
          const splits = await splitter.splitDocuments(validDocuments);
          console.log(`Created ${splits.length} chunks`);

          const BATCH_SIZE = 5; // Reduced batch size
          for (let i = 0; i < splits.length; i += BATCH_SIZE) {
            const batch = splits.slice(i, i + BATCH_SIZE);
            console.log(
              `Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(
                splits.length / BATCH_SIZE
              )}`
            );
      
    } catch (error) {
        
    }
}

