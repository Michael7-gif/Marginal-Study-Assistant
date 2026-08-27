import express from "express";
import { generateGlossary } from "../services/aiService.js";
import { requireAuth } from "../auth.js";
import { getOwnedDocument } from "../services/documentService.js";
const router=express.Router(); router.use(requireAuth);
router.post("/generate",async(req,res)=>{try{const doc = await getOwnedDocument(
  req.body?.documentId,
  req.user.id
);const result=await generateGlossary(doc.text);let data;try{data=JSON.parse(result)}catch{return res.status(500).json({success:false,message:"The AI returned an invalid glossary response."})}if(!Array.isArray(data?.terms))return res.status(500).json({success:false,message:"The AI did not return valid glossary terms."});res.json({success:true,data:{terms:data.terms}})}catch(error){console.error(error);res.status(error.status||500).json({success:false,message:error.message||"Could not generate the glossary."})}}); export default router;
