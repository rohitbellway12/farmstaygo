import express from "express";
import type {
  NextFunction,
  Request,
  Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import multer from "multer";
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
| Upload Error Handler
|--------------------------------------------------------------------------
|
| Multer runs before upload controllers. Without this handler, invalid image
| type/size errors are returned as generic Express 500 responses.
|
*/

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (error instanceof multer.MulterError) {
      const message =
        error.code === "LIMIT_FILE_SIZE"
          ? "Image size must be within the allowed upload limit"
          : error.code === "LIMIT_FILE_COUNT"
            ? "Too many images selected"
            : "Unable to process uploaded images";

      return res.status(422).json({
        success: false,
        message,
      });
    }

    if (error instanceof Error) {
      const isUploadError =
        error.message.includes("image upload") ||
        error.message.includes("images are allowed") ||
        error.message.includes("image is required");

      if (isUploadError) {
        return res.status(422).json({
          success: false,
          message: error.message,
        });
      }
    }

    next(error);
  }
);

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
