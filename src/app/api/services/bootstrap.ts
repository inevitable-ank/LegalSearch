"use server"

import { NextResponse } from "next/server";
import { createIndexIfNeccessary, pineconeIndexHasVectors } from "./pincone";
import path from "path";
import { DirectoryLoader } from "langchain/document_loaders/fs/directory"

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
        const loader = 
    } catch (error) {
        
    }
}

