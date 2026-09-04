# Vercel Deployment Settings

اس پروجیکٹ کو Vercel پر deploy کرتے وقت درج ذیل settings استعمال کریں:

1. **Root Directory:** خالی چھوڑیں، `backend` منتخب نہ کریں۔
2. **Framework Preset:** Vite
3. **Install Command:** `npm install --no-audit --no-fund`
4. **Build Command:** `npm run build`
5. **Output Directory:** `dist`
6. درج ذیل Environment Variables شامل کریں:
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `ALLOWED_ORIGINS`
   - `BLOB_READ_WRITE_TOKEN` (فائل اپ لوڈ استعمال کرنے کے لیے)

اگر پہلے سے موجود Vercel project میں `backend` بطور Root Directory منتخب ہے تو:

**Settings > Build and Deployment > Root Directory > Edit > Clear**

اس کے بعد نئی ZIP یا GitHub repository کے root کو دوبارہ deploy کریں۔

## تصدیق شدہ Commands

- Frontend production build: `npm run build`
- Backend TypeScript check: `npx tsc -p backend/tsconfig.json --noEmit`

