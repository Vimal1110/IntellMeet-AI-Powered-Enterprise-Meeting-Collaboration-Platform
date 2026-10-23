import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const mediaLike =
      file.mimetype?.startsWith("audio/") ||
      file.mimetype?.startsWith("video/") ||
      file.mimetype === "application/octet-stream";

    if (mediaLike) {
      cb(null, true);
    } else {
      cb(new Error("Only audio/video chunks are allowed"));
    }
  },
});

export default upload;
