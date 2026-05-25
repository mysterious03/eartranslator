import multer from 'multer';

// Memory storage — files are kept as Buffer in req.file.buffer
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'application/octet-stream'];
    if (allowed.includes(file.mimetype) || file.fieldname === 'audio') {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});
