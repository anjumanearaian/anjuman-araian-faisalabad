> تازہ routing correction کے لیے پہلے READ-FIRST-404-FIX-UR.md پڑھیں۔ v5.0.1 کی API entry میں رہ جانے والی خرابی v5.0.2 میں درست کی گئی ہے۔

# انجمن ارائیاں فیصل آباد: Login اور OTP کی تشخیصی رپورٹ

تاریخ: 6 ستمبر 2026 | اصلاحی ورژن: 5.0.2-routing-fix

## حتمی نتیجہ

فراہم کردہ `anjuman-araian-faisalabad-main (9).zip` میں member OTP login کا backend نامکمل ہے۔ یہ محض صارف کی غلط setting کا مسئلہ نہیں۔ اس فائل میں Supabase Auth استعمال نہیں ہو رہا۔ لہٰذا `NEXT_PUBLIC_SUPABASE_URL` اور `NEXT_PUBLIC_SUPABASE_ANON_KEY` شامل کرنے سے اس کوڈ کا OTP نظام درست نہیں ہو سکتا۔ سابقہ رہنمائی میں اس منصوبے کا اصل authentication نظام پہلے جانچنا ضروری تھا۔

اس رپورٹ کے ساتھ کوڈ کی اصلاح موجود ہے۔ اسے live website پر deploy نہیں کیا گیا، اور اصل Gmail، PostgreSQL یا Vercel account کی configuration تک رسائی نہیں تھی۔ اس لیے website کے مکمل طور پر چل جانے کی تصدیق ابھی باقی ہے۔ اسکرین شاٹ کی deployed build اور اس ZIP کا ایک ہی ہونا بھی ثابت نہیں؛ اصل live HTTP error معلوم کرنے کا طریقہ نیچے درج ہے۔

## فائل سے ثابت شدہ خرابیاں

| مسئلہ | اصل ZIP میں ثبوت | نتیجہ |
|---|---|---|
| OTP backend غائب | `backend/routes/auth.ts` صرف 1 byte، تقریباً خالی | code generate، send اور verify کرنے والے handlers موجود نہیں |
| Auth router منسلک نہیں | `backend/index.ts` میں member auth router import/mount نہیں | frontend کے تین login endpoints server پر دستیاب نہیں |
| Frontend ناموجود endpoints کو بلاتا ہے | `PasswordlessSignIn.tsx`: `/auth/email/request-otp`، `/auth/email/verify-otp`، `/auth/google` | صفحہ دکھتا ہے مگر authentication مکمل نہیں ہوتا |
| Email settings میں تضاد | `.env.example` میں `GMAIL_*`؛ `backend/lib/email.ts` میں صرف `SMTP_*` | پرانی ہدایات کے مطابق Gmail settings بھرنے سے mailer configure نہیں ہوتا |
| Health check گمراہ کن | `/api/health` صرف `GMAIL_APP_PASSWORD` دیکھتا تھا | mailer بند ہونے کے باوجود configured دکھا سکتا تھا |
| Supabase keys غیر متعلق | کوڈ میں ان environment variables کا استعمال نہیں؛ stack React/Vite + Express + Prisma/PostgreSQL ہے | درست ضرورت `DATABASE_URL`، JWT اور email transport ہے |
| نئے applicant کی session ضائع ہونا | `MemberContext.tsx` ہر refresh error پر token ہٹاتا تھا؛ unsubmitted profile پر `/members/me` 404 دیتا ہے | login کے بعد refresh پر نئے applicant کا token ضائع ہو سکتا ہے |

## اصلاحی فائل میں کیا درست کیا گیا

- Email OTP request، verification اور Google ID-token verification کے handlers شامل اور `/api/auth` کے ساتھ منسلک کیے۔
- چھ ہندسوں کا random OTP، database میں HMAC hash، دس منٹ expiry، ایک مرتبہ استعمال اور پانچ غلط کوششوں کی حد شامل کی۔ اصل code response یا logs میں واپس نہیں آتا۔
- فی email دوبارہ code کی درخواست کے درمیان 60 سیکنڈ؛ database transaction lock کے ذریعے مختلف server instances کی درخواستیں ترتیب میں آتی ہیں۔ ان locks کی اصل PostgreSQL پر جانچ ابھی باقی ہے۔
- SMTP settings اور پرانے Gmail aliases دونوں کی support، درست TLS port selection اور محدود email timeouts شامل کیے۔ Explicit SMTP values کو ترجیح ہے؛ دونوں نامکمل configurations کو آپس میں نہ ملائیں۔
- Delivery ناکام ہونے پر OTP غیر فعال اور قابلِ فہم error واپس ہوتا ہے۔
- Health check میں اصل mail configuration اور authentication tables کی availability شامل کی۔ `configured` کا مطلب صرف values موجود ہونا ہے، email delivery کی کامیابی نہیں۔
- ناموجود API، missing database tables اور database connection errors کی بہتر تشخیص شامل کی۔
- نئے applicant کی profile ابھی موجود نہ ہو تو refresh پر token محفوظ رہتا ہے؛ 401 پر ہٹتا ہے۔ متعلقہ member/form calls میں member token کو ترجیح دی۔
- Admin password کی اختیاری recovery کے لیے `scripts/reset-admin.mjs` شامل کیا۔ یہ صرف واضح طور پر منتخب موجودہ admin کا password بدلتا ہے؛ role نہیں بدلتا۔
- Vercel function کی configured مدت 10 سے 60 سیکنڈ کی تاکہ database اور SMTP کو مناسب وقت ملے۔

## ابتدائی صارف کے لیے درست ترتیب

### 1۔ درست source deploy کریں

اصلاحی ZIP extract کریں۔ Vercel سے منسلک اسی GitHub repository اور اسی branch میں اس کا source update کریں۔ صرف ZIP کو repository میں رکھ دینا کافی نہیں؛ اندر موجود source files استعمال ہونے چاہئیں۔ Project root وہ folder ہے جس میں `package.json`، `vercel.json`، `src` اور `backend` موجود ہیں۔

یہ Vite project ہے۔ موجودہ `vercel.json` کو استعمال کریں: build `npm run build`، output `dist`۔ اسے Next.js project سمجھ کر settings تبدیل نہ کریں۔

### 2۔ Vercel میں لازمی variables شامل کریں

اپنا متعلقہ project کھولیں، Settings → Environment Variables میں یہ names اور اصل values درج کریں۔ Live site کے لیے Production منتخب کریں؛ اگر Preview پر جانچ رہے ہیں تو اس environment میں بھی values لازمی ہیں۔ Secrets یہاں درج کریں، GitHub یا chat میں نہیں۔

| Name | Value / مقصد |
|---|---|
| `DATABASE_URL` | اصل PostgreSQL connection string؛ یہ database password والی `postgresql://...` string ہوتی ہے |
| `JWT_SECRET` | کم از کم 32 random bytes سے بنا مستقل secret |
| `ADMIN_USERNAME` | پہلے admin کا مطلوبہ email/username |
| `ADMIN_PASSWORD` | پہلے admin کا مضبوط password |
| `SMTP_HOST` | Gmail استعمال ہو تو `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | code بھیجنے والا Gmail account، مثلاً ادارے کا Gmail |
| `SMTP_PASSWORD` | اسی sender Gmail کا Google App Password، spaces نکال کر |
| `EMAIL_FROM` | وہی sender Gmail address |

Receiving email وہ ہے جو member form میں ڈالی جاتی ہے، مثلاً `newsandviews.marketing@gmail.com`۔ SMTP password receiving email کا نہیں بلکہ code بھیجنے والے account کا ہوگا۔

اسی Vercel deployment پر frontend/backend ہوں تو `VITE_API_URL` کو `/api` رکھیں یا خالی چھوڑیں۔ کسی پرانے/غلط external API URL کی value موجود ہو تو اسے درست کریں۔

اگر صرف پہلے سے موجود `GMAIL_USER` اور `GMAIL_APP_PASSWORD` استعمال کرنا چاہتے ہیں تو تمام `SMTP_*` values ہٹا کر یہی دو درست values رکھ سکتے ہیں۔ اصلاحی کوڈ انہیں support کرتا ہے۔ ابتدائی setup کے لیے اوپر کی واضح SMTP configuration بہتر ہے۔

### 3۔ Gmail App Password بنائیں

Sender Gmail میں login کریں۔ Google Account میں 2-Step Verification فعال کریں، پھر https://myaccount.google.com/apppasswords کھولیں۔ App کا نام مثلاً `Anjuman Website` رکھیں، نیا App Password بنائیں اور اسے `SMTP_PASSWORD` میں ڈالیں۔ عام Gmail password یہاں استعمال نہ کریں۔

اگر App Password کا اختیار نظر نہ آئے تو Google کے مطابق managed account policy، security-key-only verification یا Advanced Protection جیسی پابندیاں ہو سکتی ہیں۔ اس صورت میں account کی دستیاب settings/administrator کے مطابق SMTP provider منتخب کرنا ہوگا؛ OTP verification کو bypass نہ کریں۔

سرکاری رہنمائی: https://support.google.com/accounts/answer/185833?hl=en

### 4۔ Database connection اور tables تیار کریں

اگر PostgreSQL Supabase میں ہے تو اس کے project میں Connect سے PostgreSQL connection string حاصل کریں۔ HTTPS Project URL یا anon key کو `DATABASE_URL` میں نہ ڈالیں۔ درست database password اور deployment کے لیے موزوں direct/pooler connection استعمال کریں۔ Supabase serverless کے لیے transaction pooler کی رہنمائی دیتا ہے؛ Prisma 5 کے لیے متعلقہ pooler compatibility options بھی ضروری ہو سکتے ہیں۔ کسی نامکمل connection string کا اندازہ نہ لگائیں۔

سرکاری رہنمائی: https://supabase.com/docs/guides/database/connecting-to-postgres

ZIP extract کرنے کے بعد Windows میں project folder پر Terminal/PowerShell کھولیں۔ `.env.example` کی copy کو `.env` نام دیں اور اپنے computer پر اصل database URL و دوسری ضروری values بھریں۔ یقینی بنائیں فائل `.env.txt` نہ بنے۔ پھر:

```bash
npm install
npm run db:setup
```

`db:setup` schema کو database میں apply کرتا ہے۔ موجودہ populated database ہو تو پہلے backup رکھیں اور Prisma کی تبدیلیوں کی warning پڑھیں۔ Data loss/reset کی warning آئے تو رکیں؛ `--accept-data-loss` یا reset استعمال نہ کریں۔ نئے/خالی project میں بھی command کی کامیابی ضروری ہے، صرف Vercel build کامیاب ہونا tables بننے کی ضمانت نہیں۔

### 5۔ Redeploy کریں

Vercel میں source update اور variables محفوظ کرنے کے بعد نئی deployment بنائیں یا Deployments میں متعلقہ deployment کو Redeploy کریں۔ Variables پرانی deployment میں خود لاگو نہیں ہوتے۔

سرکاری رہنمائی: https://vercel.com/docs/environment-variables/managing-environment-variables

### 6۔ پہلے health نتیجہ دیکھیں

اپنی اصل website کے address کے آخر میں `/api/health` کھولیں۔ اصلاحی build کا متوقع جواب:

```json
{
  "status": "ok",
  "version": "5.0.2-routing-fix",
  "database": "connected",
  "authTables": "ready",
  "authentication": "configured",
  "passwordlessEmail": "configured"
}
```

جواب میں مزید fields بھی ہوں گی۔ Version مختلف ہو تو پرانی deployment کھل رہی ہے۔ `unreachable` ہو تو database connection، `missing_or_unavailable` ہو تو schema/tables یا permissions، `not_configured` ہو تو متعلقہ variables پہلے درست کریں۔ Health کا `ok` ہونا inbox delivery کی ضمانت نہیں۔

### 7۔ Admin login پہلے الگ آزمائیں

اپنی website کا `/admin` کھولیں۔ یہ username/password login ہے، member OTP نہیں۔ پہلی بار admin table خالی ہونے پر `ADMIN_USERNAME` اور `ADMIN_PASSWORD` سے account بنتا ہے۔ Database tables اور connection ضروری ہیں۔

اگر پہلے سے admin موجود ہے تو Vercel میں `ADMIN_PASSWORD` بدلنے سے اس کا موجودہ database password تبدیل نہیں ہوتا۔ اپنا پہلے سے قائم password استعمال کریں۔ اگر معلوم نہیں تو project کی private local `.env` میں درست موجودہ `ADMIN_USERNAME` اور نیا کم از کم 12 حروف کا `ADMIN_PASSWORD` رکھ کر صرف recovery کے وقت چلائیں:

```bash
node scripts/reset-admin.mjs
```

یہ command حقیقی database میں اسی admin کا password بدلتی ہے، اس لیے صرف اپنے مطلوبہ account کے لیے چلائیں۔ Username غلط ہو تو command account نہیں بنائے گی۔

### 8۔ Member OTP آزمائیں

`/member/register` یا `/member/login` کھولیں۔ اپنا receiving email درج کر کے Send Login Code دبائیں۔ کامیاب response کے بعد inbox اور Spam دیکھیں، تازہ چھ ہندسوں والا code دس منٹ کے اندر درج کریں۔ نئے applicant کو registration form اور پہلے سے linked member کو portal کھلنا چاہیے۔

ایک ہی code دوبارہ استعمال نہیں ہو سکتا۔ resend کے لیے 60 سیکنڈ انتظار کریں۔ پانچ غلط codes کے بعد نیا code لیں۔ Email service نے message قبول کیا ہو تب بھی inbox تک پہنچنا الگ delivery مرحلہ ہے۔

Google button کے لیے الگ Google OAuth Web Client اور اصل website origin درکار ہیں۔ `GOOGLE_CLIENT_ID` اور `VITE_GOOGLE_CLIENT_ID` دونوں میں ایک ہی حقیقی client ID رکھیں اور redeploy کریں۔ Email OTP کے لیے یہ ضروری نہیں۔

## اگر پھر بھی error آئے تو اصل وجہ کیسے نکالیں

1. Browser میں F12 دبائیں، Network tab کھولیں۔
2. Send Login Code صرف ایک مرتبہ دبائیں۔
3. `request-otp` نام والی request کھولیں۔ Request URL، Status Code اور Response دیکھیں۔
4. ان تین چیزوں کا screenshot دیں۔ Authorization headers، cookies، password یا code مت دکھائیں۔
5. Server error ہو تو اسی وقت کی Vercel Function logs میں متعلقہ request دیکھیں۔

| نتیجہ | اگلا قدم |
|---|---|
| 404 / Cannot POST | route موجود نہیں، غلط deployment یا API URL؛ درست source/backend deploy کریں |
| 503، SMTP not configured | SMTP variables اسی environment میں مکمل کریں |
| 503، database tables/columns missing | Prisma schema apply کریں |
| 503، database unreachable | DATABASE_URL، password، network/pooler اور database availability چیک کریں |
| 502، email service failed | SMTP credentials/delivery logs؛ `EAUTH` پر sender/App Password، connection timeout پر network/provider |
| 429 | انتظار کریں؛ اسی email کے لیے 60 سیکنڈ، login/IP limit ہو تو پیغام کے مطابق 15 منٹ |
| 200 مگر email نہیں | Spam اور mail delivery چیک کریں؛ API قبول ہونا inbox وصولی نہیں |
| verify پر 400 | تازہ code، درست email، expiry اور پانچ کوششوں کی حد چیک کریں |
| admin پر 401 | database میں موجود username/password؛ member OTP استعمال نہ کریں |
| HTML صفحہ یا 504 | routing یا server timeout کی Function logs دیکھیں |

## جانچ اور باقی حدود

- Prisma Client generation کامیاب۔
- Frontend اور backend TypeScript checks کامیاب۔
- Vite production build کامیاب؛ bundle size کی غیر مسدود warning موجود ہے۔
- Auth regression میں 19 assertions کامیاب: درست/غلط email، missing SMTP، normalization، hashed OTP، response میں code نہ ہونا، resend limit، غلط code، درست verification/JWT، دوبارہ استعمال، expiry، پانچ کوششیں، resend invalidation، mail failure، missing Google configuration۔
- HTTP/router، hashing اور JWT حقیقی کوڈ کے ساتھ؛ database/SMTP کے test doubles استعمال ہوئے۔ اصل PostgreSQL transactions/locking، Gmail delivery، Google OAuth، live admin credentials اور مکمل form/portal journey کی end-to-end تصدیق نہیں ہوئی۔
- یہ authentication repair ہے؛ اسے تمام project features کی completion certificate نہ سمجھیں۔ پرانی membership records جن میں `authUserId` خالی ہے، ان کی linking الگ جانچیں۔ نئی member session خود بخود admin اختیار نہیں دیتی۔

اگلی فیصلہ کن معلومات: نئی deployment کا `/api/health` جواب، اور اگر OTP ناکام ہو تو Network میں `request-otp` کا status اور response۔ ان سے باقی live configuration کی خرابی کا اندازہ لگانے کے بجائے اس کی صحیح شناخت ہوگی۔
