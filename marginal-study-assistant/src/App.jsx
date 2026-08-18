import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard/Dashboard";
import MyDocuments from "./pages/MyDocuments/MyDocuments";
import PDFReader from "./pages/PDFReader/PDFReader";
import Summary from "./pages/Summary/Summary";
import Sections from "./pages/Sections/Sections";
import Glossary from "./pages/Glossary/Glossary";
import QA from "./pages/QA/QA";
import Quiz from "./pages/Quiz/Quiz";
import Progress from "./pages/Progress/Progress";

function PrivateShell() {
  return <div className="app-shell"><Sidebar /><main className="app-main"><Routes>
    <Route path="/" element={<Dashboard />} /><Route path="/documents" element={<MyDocuments />} /><Route path="/reader" element={<PDFReader />} />
    <Route path="/summary" element={<Summary />} /><Route path="/sections" element={<Sections />} /><Route path="/glossary" element={<Glossary />} /><Route path="/qa" element={<QA />} /><Route path="/quiz" element={<Quiz />} /><Route path="/progress" element={<Progress />} />
  </Routes></main></div>;
}

export default function App(){return <BrowserRouter><Routes><Route path="/login" element={<Login/>}/><Route path="/forgot-password" element={<ForgotPassword/>}/><Route path="/signup" element={<Signup/>}/><Route element={<ProtectedRoute/>}><Route path="*" element={<PrivateShell/>}/></Route></Routes></BrowserRouter>;}
