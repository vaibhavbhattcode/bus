# 📦 Required Dependencies Installation Guide

## Backend Dependencies

### New Dependencies to Install:

```bash
cd e:\Bus\backend

# Production dependencies
npm install winston@^3.11.0 nest-winston@^1.9.4

# Development dependencies  
npm install --save-dev @types/winston@^2.4.4 @types/multer@^1.4.11
```

### Dependencies Added:
1. **winston** - Professional logging library
2. **nest-winston** - NestJS Winston integration
3. **@types/winston** - TypeScript types for Winston
4. **@types/multer** - TypeScript types for file uploads

---

## Frontend Dependencies

Currently using Vite, so environment variables work with `import.meta.env`.
No additional dependencies needed - types already configured!

---

## Environment Variables

### Backend (.env)
Add these to your `.env` file:

```env
# Logging
LOG_LEVEL=info  # or: error, warn, debug, verbose

# File Upload
UPLOAD_DIR=./uploads
BASE_URL=http://localhost:3000
MAX_FILE_SIZE=5242880  # 5MB in bytes

# Redis (if not already configured)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Frontend (.env)
Already configured:
```env
VITE_API_URL=http://localhost:3000/api
```

---

## Post-Installation Steps

1. **Create logs directory** (Backend):
```bash
cd e:\Bus\backend
mkdir logs
```

2. **Create uploads directory** (Backend):
```bash
cd e:\Bus\backend
mkdir uploads
mkdir uploads\provider-documents
mkdir uploads\profile-pictures
```

3. **Update .gitignore** (Backend):
Add to `.gitignore`:
```
logs/
uploads/
*.log
```

4. **Test the installation**:
```bash
# Backend
cd e:\Bus\backend
npm run start:dev

# Frontend
cd e:\Bus\frontend
npm run dev
```

---

## Verification Checklist

- [ ] Winston installed successfully
- [ ] No TypeScript errors in backend
- [ ] No TypeScript errors in frontend
- [ ] Logs directory exists
- [ ] Uploads directory exists
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Error Boundary works (cause an error to test)
- [ ] Skeleton loaders display correctly

---

**Ready for next phase after these steps complete!**
