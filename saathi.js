import { GoogleGenAI } from "@google/genai";
import { TEXT_MODEL, SAATHI, ok } from "./_shared.js";
export default async function handler(req,res){
  if(!ok(req,res))return;
  try{
    const h=Array.isArray(req.body?.history)?req.body.history.slice(-8):[];
    const q=String(req.body?.q||"").slice(0,800); if(!q)return res.status(400).json({error:"empty"});
    const contents=[...h.map(m=>({role:m.r==="u"?"user":"model",parts:[{text:String(m.t).slice(0,800)}]})),{role:"user",parts:[{text:q}]}];
    const ai=new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY});
    const r=await ai.models.generateContent({model:TEXT_MODEL,contents,config:{systemInstruction:SAATHI,maxOutputTokens:500}});
    res.status(200).json({text:r.text||""});
  }catch(e){console.error(e);res.status(500).json({error:"saathi_failed"})}
}
