# HTTP 404 Routing Repair: v5.0.2

اس پیکیج کو v5.0.1 کی جگہ استعمال کریں۔

پچھلے پیکیج میں api/index.ts کی نامکمل سطر رہ گئی تھی:
app.use("/api/auth", passwordlessAuthRouter);
اس فائل میں app اور passwordlessAuthRouter کی definitions یا default handler export نہیں تھا۔ پہلے check script میں api folder شامل نہیں تھا، اس لیے یہ خرابی جانچ میں پکڑی نہیں گئی۔ یہ پچھلی اصلاح کی کمی تھی۔ Screenshot سے live درخواست کا HTTP 404 ثابت ہے؛ اس کا exact deployment سبب live URL/response کے بغیر ثابت نہیں۔

اب api/index.ts صحیح Express app import/export کرتا ہے۔ vercel.json میں /api/:path* کو /api function کے لیے واضح rewrite دیا ہے، SPA fallback کے پہلے۔ Build اور check دونوں API entry کی TypeScript جانچ کرتے ہیں۔ API کے duplicate 404 handler کو بھی درست کیا ہے۔

## صرف یہ اگلے قدم کریں

1. ZIP extract کریں اور اس کے اندر source files Vercel سے منسلک GitHub repository/branch میں update کریں۔ صرف ZIP اپلوڈ کرنا کافی نہیں۔
2. خاص طور پر api/index.ts، vercel.json، package.json، tsconfig.api.json اور backend/index.ts نئی فائلیں ہونی چاہییں۔ مکمل ZIP استعمال کریں تاکہ گزشتہ OTP اصلاحات بھی ساتھ رہیں۔
3. Vercel Project Settings میں Root Directory اسی folder کا ہو جس میں package.json، api اور backend ہیں۔ اسے src یا dist پر نہ رکھیں۔
4. اگر VITE_API_URL موجود ہے تو اسی website پر backend کے لیے اس کی value /api کریں۔
5. نئی commit کی deployment بنائیں۔ پھر اپنی website پر /api/health کھولیں۔ جواب میں version: 5.0.2-routing-fix آنا چاہیے۔
6. اس کے بعد member login آزمائیں۔ Health میں setup_required یا database/email configuration کا error ہو تو اس کے مطابق مرکزی اردو رپورٹ کے steps استعمال کریں۔

404 کا مطلب یہ نہیں کہ Gmail password غلط ہے۔ پہلے صحیح API تک درخواست پہنچانا ضروری ہے۔ صرف اس error کی وجہ سے SMTP یا Supabase credentials بار بار تبدیل نہ کریں۔

اگر /api/health پر بھی 404 آئے تو website کا مکمل URL، Vercel کی نئی deployment کا status اور Root Directory دکھائیں۔ اگر health کھل جائے مگر OTP پر 404 ہو تو F12 > Network > request-otp کا Request URL، HTTP status اور Response دکھائیں۔ Secrets اور Authorization headers نہ دکھائیں۔

## Validation

Frontend، backend اور API-entry TypeScript checks اور Vite build کامیاب۔ Actual api/index.ts کو local HTTP server میں load کر کے health، OTP request/verify، admin login اور unknown API route جانچے گئے؛ database test double استعمال ہوا۔ الگ OTP suite کی 19 assertions بھی کامیاب۔ Live Vercel routing، اصل database اور inbox delivery ابھی verify نہیں ہوئے۔

Official routing reference: https://vercel.com/docs/routing/rewrites
