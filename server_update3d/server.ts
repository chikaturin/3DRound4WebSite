import express, { Application, Request, Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import modelsRouter from "./routers/models.router";

dotenv.config();

const app: Application = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Static files (serve uploaded models)
const UPLOADS_DIR = process.env.UPLOADS_DIR || "uploads";
app.use("/files", express.static(UPLOADS_DIR));

// Healthcheck
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api/models", modelsRouter);

// Swagger setup
const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Model3D API",
      version: "1.0.0",
      description: "API to create and fetch 3D models",
    },
    servers: [{ url: "http://localhost:4000", description: "Local server" }],
  },
  apis: ["./routers/*.ts", "./controller/*.ts", "./models/*.ts"],
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Mongo connection
const DATABASE_URI = process.env.DATABASE_URI || "mongodb+srv://ninhhoaithanh:test123@cluster0.e9juedj.mongodb.net/";

console.log("Full connection string length:", DATABASE_URI.length);
console.log("Connecting to MongoDB with URI:", DATABASE_URI.replace(/\/\/.*@/, "//***:***@"));

mongoose
  .connect(DATABASE_URI, {
    dbName: "model3d_database"
  })
  .then(() => {
    const port = 3001;
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on http://localhost:${port}`);
      // eslint-disable-next-line no-console
      console.log(`Swagger docs on http://localhost:${port}/api-docs`);
      // eslint-disable-next-line no-console
      console.log(`Connected to MongoDB Atlas`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });

export default app;
