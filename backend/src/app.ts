import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";

import routes from "./routes/index.js";

const app = express();

/*
|--------------------------------------------------------------------------
| Allowed Origins
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  process.env.WEBSITE_URL,
  process.env.PORTAL_URL,
].filter(Boolean) as string[];

/*
|--------------------------------------------------------------------------
| Security Middleware
|--------------------------------------------------------------------------
*/

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

/*
|--------------------------------------------------------------------------
| Request Middleware
|--------------------------------------------------------------------------
*/

app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| Public Storage
|--------------------------------------------------------------------------
|
| Files inside storage/public are available through:
| http://localhost:5000/storage/...
|
*/

const publicStoragePath = path.resolve(
  process.env.STORAGE_PATH || "storage/public"
);

app.use(
  "/storage",
  express.static(publicStoragePath)
);

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api", routes);

/*
|--------------------------------------------------------------------------
| Not Found Handler
|--------------------------------------------------------------------------
*/

app.use((_req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

export default app;