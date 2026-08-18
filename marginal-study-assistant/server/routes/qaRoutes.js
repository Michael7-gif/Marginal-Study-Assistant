import express from "express";
import { generateQA } from "../services/aiService.js";
import { requireAuth } from "../auth.js";
import { getOwnedDocument } from "../services/documentService.js";
const router=express.Router(); router.use(requireAuth);
router.post("/ask",async(req,res)=>{try{const {documentId,question}=req.body||{};if(!question?.trim())return res.status(400).json({success:false,message:"Please provide a question."});const doc = await getOwnedDocument(documentId,req.user.id);const result=await generateQA(doc.text,question);let data;try{data=JSON.parse(result)}catch{return res.status(500).json({success:false,message:"The AI returned an invalid answer."})}if(!data?.answer)return res.status(500).json({success:false,message:"The AI did not return an answer."});res.json({success:true,data})}catch(error){console.error(error);res.status(error.status||500).json({success:false,message:error.message||"Could not answer the question."})}});
export default router;
