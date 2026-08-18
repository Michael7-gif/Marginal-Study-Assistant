import express from "express";
import { generateQuiz } from "../services/aiService.js";
import { requireAuth } from "../auth.js";
import { getOwnedDocument } from "../services/documentService.js";
const router=express.Router(); router.use(requireAuth);
router.post("/generate",async(req,res)=>{try{const {documentId,questionCount=10,questionType="mixed",difficulty="mixed"}=req.body||{};const doc = await getOwnedDocument(documentId,req.user.id);const result=await generateQuiz(doc.text,Number(questionCount),questionType,difficulty);let data;try{data=JSON.parse(result)}catch{return res.status(500).json({success:false,message:"The AI returned an invalid quiz response."})}if(!Array.isArray(data?.questions))return res.status(500).json({success:false,message:"The AI did not return valid quiz questions."});res.json({success:true,data:{questions:data.questions}})}catch(error){console.error(error);res.status(error.status||500).json({success:false,message:error.message||"Could not generate quiz questions."})}}); export default router;
