import { initiateBootStrapping } from '../services/bootstrap'
import {NextResponse} from 'next/server'

export async function Post(){
    // initiate bootstrapping

    await initiateBootStrapping(process.env.PINECONE_INDEX as string){
        return NextResponse.json({ success: true }, { status: 200 })
    }
}