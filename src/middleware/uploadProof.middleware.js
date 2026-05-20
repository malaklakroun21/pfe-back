const path = require('path');
const { randomUUID } = require('crypto');
const multer = require('multer');

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads', 'validation-proofs'),
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const uploadProof = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter(_req, file, cb) {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed. Use PDF, JPEG, PNG or DOCX.'));
    }
  },
}).single('proofFile');

module.exports = uploadProof;
