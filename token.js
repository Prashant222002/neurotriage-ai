import { GoogleGenAI } from "@google/genai";
import { LIVE_MODEL, TRAINER, ok } from "./_shared.js";
export default async function handler(req,res){
  if(!ok(req,res))return;
  try{
    const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
    const t=await ai.authTokens.create({config:{
      uses:1,
      expireTime:new Date(Date.now()+30*60*1000).toISOString(),
      newSessionExpireTime:new Date(Date.now()+60*1000).toISOString(),
      liveConnectConstraints:{model:LIVE_MODEL,config:{responseModalities:["AUDIO"]}}
    }});
    res.status(200).json({token:t.name,model:LIVE_MODEL,system:TRAINER});
  }catch(e){console.error(e);res.status(500).json({error:"token_failed"})}
}
