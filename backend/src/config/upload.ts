import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";
import sharp from "sharp";

/*
|--------------------------------------------------------------------------
| Upload Types
|--------------------------------------------------------------------------
*/

export type PublicUploadFolder =
  | "property-categories"
  | "amenities"
  | "properties"
  | "profiles"
  | "cms"
  | "settings";

/*
|--------------------------------------------------------------------------
| Public Storage Root
|--------------------------------------------------------------------------
|
| This path must match the public storage path configured in app.ts.
|
*/

export const publicStorageRoot = path.resolve(
  process.env.STORAGE_PATH || "storage/public"
);

/*
|--------------------------------------------------------------------------
| Allowed Image Types
|--------------------------------------------------------------------------
*/

const allowedImageMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const allowedImageExtensions = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
];

/*
|--------------------------------------------------------------------------
| Create Upload Directory
|--------------------------------------------------------------------------
*/

const ensureUploadDirectory = (
  folder: PublicUploadFolder
): string => {
  const uploadDirectory = path.join(
    publicStorageRoot,
    folder
  );

  fs.mkdirSync(uploadDirectory, {
    recursive: true,
  });

  return uploadDirectory;
};

/*
|--------------------------------------------------------------------------
| Generate Safe File Name
|--------------------------------------------------------------------------
*/

const createSafeFileName = (
  originalName: string
): string => {
  const extension = path
    .extname(originalName)
    .toLowerCase();

  const baseName = path
    .basename(originalName, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);

  const uniqueId = crypto
    .randomBytes(5)
    .toString("hex");

  const timestamp = Date.now();

  return `${
    baseName || "image"
  }-${timestamp}-${uniqueId}${extension}`;
};

/*
|--------------------------------------------------------------------------
| Create Public Image Upload Middleware
|--------------------------------------------------------------------------
*/

export const createPublicImageUpload = (
  folder: PublicUploadFolder,
  maxFileSizeInMb = 5
) => {
  const uploadDirectory =
    ensureUploadDirectory(folder);

  const storage = multer.diskStorage({
    destination: (
      _request,
      _file,
      callback
    ) => {
      callback(null, uploadDirectory);
    },

    filename: (
      _request,
      file,
      callback
    ) => {
      callback(
        null,
        createSafeFileName(file.originalname)
      );
    },
  });

  return multer({
    storage,

    limits: {
      fileSize:
        maxFileSizeInMb * 1024 * 1024,
      files: 1,
    },

    fileFilter: (
      _request,
      file,
      callback
    ) => {
      const extension = path
        .extname(file.originalname)
        .toLowerCase();

      const isValidMimeType =
        allowedImageMimeTypes.includes(
          file.mimetype
        );

      const isValidExtension =
        allowedImageExtensions.includes(
          extension
        );

      if (
        !isValidMimeType ||
        !isValidExtension
      ) {
        callback(
          new Error(
            "Only JPG, JPEG, PNG and WEBP images are allowed"
          )
        );

        return;
      }

      callback(null, true);
    },
  });
};

/*
|--------------------------------------------------------------------------
| Build Public Storage Path
|--------------------------------------------------------------------------
*/

export const getPublicStoragePath = (
  folder: PublicUploadFolder,
  fileName: string
): string => {
  return `/storage/${folder}/${fileName}`;
};

/*
|--------------------------------------------------------------------------
| Delete Public Storage File
|--------------------------------------------------------------------------
*/

export const deletePublicStorageFile = (
  storedPath?: string | null
): void => {
  if (!storedPath) {
    return;
  }

  const normalizedPath = storedPath
    .replace(/^\/+/, "")
    .replace(/^storage\//, "");

  const absolutePath = path.resolve(
    publicStorageRoot,
    normalizedPath
  );

  const safeStoragePrefix = `${publicStorageRoot}${path.sep}`;

  /*
  |--------------------------------------------------------------------------
  | Prevent Path Traversal
  |--------------------------------------------------------------------------
  */

  if (
    absolutePath !== publicStorageRoot &&
    !absolutePath.startsWith(safeStoragePrefix)
  ) {
    console.error(
      "Blocked unsafe storage file deletion:",
      storedPath
    );

    return;
  }

  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (error) {
    console.error(
      "Unable to delete public storage file:",
      absolutePath,
      error
    );
  }
};

/*
|--------------------------------------------------------------------------
| Property Image Upload
|--------------------------------------------------------------------------
|
| Property images are stored inside:
| storage/public/properties/{propertyId}
|
*/

export const createPropertyImageUpload = (
  maxFileSizeMB = 8
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
  ];

  const storage = multer.diskStorage({
    destination: (
      req,
      _file,
      callback
    ) => {
      const propertyId = String(
        req.params.id || ""
      )
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "");

      if (!propertyId) {
        callback(
          new Error(
            "Property ID is required for image upload"
          ),
          ""
        );

        return;
      }

      const propertyDirectory = path.join(
        publicStorageRoot,
        "properties",
        propertyId
      );

      fs.mkdirSync(propertyDirectory, {
        recursive: true,
      });

      callback(null, propertyDirectory);
    },

    filename: (
      _req,
      file,
      callback
    ) => {
      const originalExtension = path
        .extname(file.originalname)
        .toLowerCase();

      const extension =
        allowedExtensions.includes(
          originalExtension
        )
          ? originalExtension
          : file.mimetype === "image/png"
            ? ".png"
            : file.mimetype === "image/webp"
              ? ".webp"
              : ".jpg";

      const originalName = path
        .basename(
          file.originalname,
          originalExtension
        )
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);

      const safeBaseName =
        originalName || "property-image";

      const uniqueName = [
        safeBaseName,
        Date.now(),
        crypto.randomBytes(4).toString("hex"),
      ].join("-");

      callback(
        null,
        `${uniqueName}${extension}`
      );
    },
  });

  return multer({
    storage,

    limits: {
      fileSize:
        maxFileSizeMB * 1024 * 1024,

      files: 10,
    },

    fileFilter: (
      _req,
      file,
      callback
    ) => {
      const extension = path
        .extname(file.originalname)
        .toLowerCase();

      const validMimeType =
        allowedMimeTypes.includes(
          file.mimetype
        );

      const validExtension =
        allowedExtensions.includes(
          extension
        );

      if (
        !validMimeType ||
        !validExtension
      ) {
        callback(
          new Error(
            "Only JPG, JPEG, PNG and WEBP property images are allowed"
          )
        );

        return;
      }

      callback(null, true);
    },
  });
};

/*
|--------------------------------------------------------------------------
| Property Image Public Path
|--------------------------------------------------------------------------
*/

export const getPropertyImageStoragePath = (
  propertyId: string,
  fileName: string
): string => {
  return `/storage/properties/${propertyId}/${fileName}`;
};

/*
|--------------------------------------------------------------------------
| Room Image Upload
|--------------------------------------------------------------------------
|
| Room images are stored inside:
|
| storage/public/properties/{propertyId}/rooms/{roomTypeId}
|
*/

export const createRoomImageUpload = (
  maxFileSizeMB = 8
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  const allowedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
  ];

  const storage = multer.diskStorage({
    destination: (
      req,
      _file,
      callback
    ) => {
      const propertyId = String(
        req.params.propertyId || ""
      )
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "");

      const roomTypeId = String(
        req.params.roomTypeId || ""
      )
        .trim()
        .replace(/[^a-zA-Z0-9_-]/g, "");

      if (!propertyId) {
        callback(
          new Error(
            "Property ID is required for room image upload"
          ),
          ""
        );

        return;
      }

      if (!roomTypeId) {
        callback(
          new Error(
            "Room type ID is required for image upload"
          ),
          ""
        );

        return;
      }

      const roomDirectory = path.join(
        publicStorageRoot,
        "properties",
        propertyId,
        "rooms",
        roomTypeId
      );

      fs.mkdirSync(roomDirectory, {
        recursive: true,
      });

      callback(null, roomDirectory);
    },

    filename: (
      _req,
      file,
      callback
    ) => {
      const originalExtension = path
        .extname(file.originalname)
        .toLowerCase();

      const extension =
        allowedExtensions.includes(
          originalExtension
        )
          ? originalExtension
          : file.mimetype === "image/png"
            ? ".png"
            : file.mimetype === "image/webp"
              ? ".webp"
              : ".jpg";

      const originalName = path
        .basename(
          file.originalname,
          originalExtension
        )
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);

      const safeBaseName =
        originalName || "room-image";

      const uniqueName = [
        safeBaseName,
        Date.now(),
        crypto
          .randomBytes(4)
          .toString("hex"),
      ].join("-");

      callback(
        null,
        `${uniqueName}${extension}`
      );
    },
  });

  return multer({
    storage,

    limits: {
      fileSize:
        maxFileSizeMB * 1024 * 1024,

      files: 10,
    },

    fileFilter: (
      _req,
      file,
      callback
    ) => {
      const extension = path
        .extname(file.originalname)
        .toLowerCase();

      const validMimeType =
        allowedMimeTypes.includes(
          file.mimetype
        );

      const validExtension =
        allowedExtensions.includes(
          extension
        );

      if (
        !validMimeType ||
        !validExtension
      ) {
        callback(
          new Error(
            "Only JPG, JPEG, PNG and WEBP room images are allowed"
          )
        );

        return;
      }

      callback(null, true);
    },
  });
};

/*
|--------------------------------------------------------------------------
| Room Image Public Path
|--------------------------------------------------------------------------
*/

export const getRoomImageStoragePath = (
  propertyId: string,
  roomTypeId: string,
  fileName: string
): string => {
  return `/storage/properties/${propertyId}/rooms/${roomTypeId}/${fileName}`;
};

/*
|--------------------------------------------------------------------------
| Settings Image Upload
|--------------------------------------------------------------------------
|
| Logo and favicon images are stored inside:
| storage/public/settings/
|
*/

export const createSettingsImageUpload = (
  maxFileSizeMB = 2
) => {
  const uploadDirectory = ensureUploadDirectory("settings");

  const storage = multer.diskStorage({
    destination: (_request, _file, callback) => {
      callback(null, uploadDirectory);
    },
    filename: (_request, file, callback) => {
      callback(null, createSafeFileName(file.originalname));
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: maxFileSizeMB * 1024 * 1024,
      files: 2,
    },
    fileFilter: (_request, file, callback) => {
      const extension = path
        .extname(file.originalname)
        .toLowerCase();

      const isValidMimeType =
        allowedImageMimeTypes.includes(file.mimetype);

      const isValidExtension =
        allowedImageExtensions.includes(extension);

      if (!isValidMimeType || !isValidExtension) {
        callback(
          new Error(
            "Only JPG, JPEG, PNG and WEBP images are allowed"
          )
        );
        return;
      }

      callback(null, true);
    },
  });
};

export const getSettingsImageStoragePath = (
  fileName: string
): string => {
  return `/storage/settings/${fileName}`;
};

/*
|--------------------------------------------------------------------------
| Home Page Image Upload (memory storage + sharp crop)
|--------------------------------------------------------------------------
|
| Hero and "Grow with FarmStayGo" section images are cropped server
| side to a fixed size so oversized uploads still render correctly.
|
*/

export const HOME_IMAGE_SIZES = {
  hero: { width: 1920, height: 1080 },
  grow: { width: 1000, height: 800 },
} as const;

export const createHomeImageUpload = (
  maxFileSizeMB = 5
) => {
  const storage = multer.memoryStorage();

  return multer({
    storage,
    limits: {
      fileSize: maxFileSizeMB * 1024 * 1024,
      files: 2,
    },
    fileFilter: (_request, file, callback) => {
      const extension = path
        .extname(file.originalname)
        .toLowerCase();

      const isValidMimeType =
        allowedImageMimeTypes.includes(file.mimetype);
      const isValidExtension =
        allowedImageExtensions.includes(extension);

      if (!isValidMimeType || !isValidExtension) {
        callback(
          new Error(
            "Only JPG, JPEG, PNG and WEBP images are allowed"
          )
        );
        return;
      }

      callback(null, true);
    },
  });
};

export const processHomeImage = async (
  file: Express.Multer.File,
  width: number,
  height: number
): Promise<string> => {
  const uploadDirectory = ensureUploadDirectory("settings");
  const fileName = createSafeFileName(file.originalname);
  const outputPath = path.join(uploadDirectory, fileName);

  await sharp(file.buffer)
    .resize(width, height, {
      fit: "cover",
      position: "centre",
    })
    .toFile(outputPath);

  return getSettingsImageStoragePath(fileName);
};