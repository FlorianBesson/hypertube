import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Define path for avatar images storage and ensure the directories exist recursively
export const uploadDirectory = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

// Multer disk storage engine configuration
const storage = multer.diskStorage({
    // Set destination directory for uploaded files
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },
    // Generate a unique filename using userId, current timestamp and file extension
    filename: (req, file, cb) => {
        const userId = (req as any).user?.userId || 'unknown';
        const ext = path.extname(file.originalname);
        cb(null, `avatar-${userId}-${Date.now()}${ext}`);
    }
});

// Configure Multer instance with validation constraints and storage rules
export const upload = multer({
    storage,
    limits: {
        // Enforce a maximum file size of 2MB
        fileSize: 2 * 1024 * 1024 // 2MB
    },
    // Filter uploads to accept only specific graphic formats
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            cb(null, true); // Allow upload
        } else {
            cb(new Error("Seules les images (jpeg, jpg, png, webp) sont autorisées")); // Reject upload
        }
    }
});
