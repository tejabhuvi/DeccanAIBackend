import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();    
import { model } from "./AI/geminiApi.js";
const app = express();
app.use(express.json());
app.use(cors());
import uploadRoutes from "./routes/upload.js";
import analyzeRoutes from "./routes/analyze.js";
import chatRouter from "./routes/chat.js";
import questionRouter from "./routes/questions.js"
import evaluateRouter from './routes/evaluate.js'
import processRouter from "./routes/process.js"
app.use("/api", chatRouter);
app.use("/api", uploadRoutes);
app.use("/api",questionRouter);
app.use("/api",processRouter);
app.use("/api",evaluateRouter);  
app.use("/api", analyzeRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});