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
const DATABASE_URI =
  process.env.DATABASE_URI ||
  "mongodb://chikarin:123@localhost:27017/model3D?authSource=admin";

mongoose
  .connect(DATABASE_URI)
  .then(() => {
    const port = Number(process.env.PORT) || 1909;
    app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`Server running on http://localhost:${port}`);
      // eslint-disable-next-line no-console
      console.log(`Swagger docs on http://localhost:${port}/api-docs`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  });

export default app;
