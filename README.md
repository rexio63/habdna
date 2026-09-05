# هبدنا | HABDANA

موقع ألعاب جلسات عربي، بسيط بالكامل: `index.html` + `style.css` + `script.js` + `config.js`.
بدون Flutter، بدون React/Next.js، بدون Node.js على جهة العرض — جاهز للعمل مباشرة على **GitHub Pages**.

يحتوي على 3 ألعاب:
- 🧠 **هبد الأسئلة** — أسئلة عامة، مع إمكانية توليد أسئلة جديدة عربية عبر **Groq API**.
- 🎵 **خمن الأغنية** — تخمين محلي، مع إمكانية جلب أغانٍ حقيقية (اسم + فنان + صورة غلاف) عبر **Spotify API**.
- 👑 **الحاكم والجلاد** — لعبة أدوار اجتماعية (بدون تغيير).

---

## 1) لماذا يوجد مجلد `worker/` إذا كان المشروع "بدون Backend"؟

هذه نقطة أمان مهمة جدًا:

> **GitHub Pages يستضيف ملفات ثابتة فقط.** أي مفتاح API تضعه داخل `index.html` أو `style.css` أو `script.js`
> سيكون مرئيًا لأي شخص يفتح "أدوات المطور" في المتصفح، حتى لو كان الكود "مخفيًا" أو مُشفّرًا شكليًا.
> **لا توجد طريقة لإخفاء مفتاح سري داخل كود يعمل في متصفح المستخدم.**

لذلك، ولحماية مفاتيح `GROQ_API_KEY` و `SPOTIFY_CLIENT_ID` و `SPOTIFY_CLIENT_SECRET` فعليًا:

- الموقع نفسه (`index.html`, `style.css`, `script.js`, `config.js`) يبقى **ثابتًا 100%** ويُنشر على GitHub Pages كما طلبت، بدون أي Framework.
- مجلد `worker/` يحتوي على **خادم وسيط صغير جدًا (Cloudflare Worker)** — سطر كود واحد تقريبًا لكل مسار — مهمته الوحيدة استقبال الطلب من موقعك، إضافة المفتاح السري من متغيرات البيئة، ثم تمرير الطلب إلى Groq أو Spotify وإرجاع النتيجة فقط.
- **المفتاح لا يُكتب أبدًا داخل أي ملف** في المستودع. يتم ضبطه كسر (Secret) داخل Cloudflare عبر GitHub Actions، ولا يظهر إطلاقًا لا في الكود ولا في سجلّات (Logs) الأكشن.
- Cloudflare Workers له باقة مجانية سخية (100,000 طلب/يوم) وهذا يكفي لمشروع مثل هذا دون أي تكلفة.

**خلاصة:** موقعك يبقى GitHub Pages فقط، والخادم الوسيط (Worker) هو الجزء الوحيد الذي "يعرف" المفاتيح، وهو منفصل تمامًا ولا يغيّر طريقة استضافة الموقع.

---

## 2) بنية المشروع

```
.
├── index.html              ← الموقع (بدون تغيير في الفكرة، فقط إضافات)
├── style.css                ← التنسيق (تصحيح خطأ بسيط + أنماط جديدة)
├── script.js                 ← منطق الألعاب + استدعاء الـ API مع fallback محلي
├── config.js                  ← رابط الخادم الوسيط فقط (عام، غير سري)
├── worker/
│   ├── worker.js                ← كود الخادم الوسيط (Cloudflare Worker)
│   └── wrangler.toml             ← إعدادات نشر الـ Worker (بدون أي مفتاح)
├── .github/workflows/
│   ├── deploy-pages.yml           ← نشر الموقع على GitHub Pages (اختياري)
│   └── deploy-worker.yml           ← نشر الـ Worker + ضبط الأسرار في Cloudflare
└── README.md
```

---

## 3) خطوات الإعداد الكاملة

### أ) إنشاء مفاتيح Groq و Spotify

1. **Groq**: أنشئ حسابًا على https://console.groq.com ثم أنشئ مفتاح API من صفحة "API Keys". هذا هو `GROQ_API_KEY`.
2. **Spotify**: افتح https://developer.spotify.com/dashboard وسجّل الدخول، ثم اضغط "Create app". بعد الإنشاء ستجد:
   - `Client ID` → هذا هو `SPOTIFY_CLIENT_ID`
   - `Client secret` → هذا هو `SPOTIFY_CLIENT_SECRET`
   (لا تحتاج لضبط Redirect URI لأننا نستخدم Client Credentials Flow فقط للبحث، بدون تسجيل دخول مستخدم).

### ب) إنشاء حساب Cloudflare (مجاني) للخادم الوسيط

1. أنشئ حسابًا مجانيًا على https://dash.cloudflare.com
2. من الصفحة الرئيسية للحساب، انسخ **Account ID** (يظهر في الشريط الجانبي الأيمن لصفحة النظرة العامة). هذا هو `CLOUDFLARE_ACCOUNT_ID`.
3. أنشئ API Token من: My Profile → API Tokens → Create Token → استخدم قالب **"Edit Cloudflare Workers"** (أو صلاحية Workers Scripts: Edit). هذا هو `CLOUDFLARE_API_TOKEN`.

### ج) إضافة GitHub Secrets (بالضبط هنا)

في مستودعك على GitHub:

```
Settings → Secrets and variables → Actions → New repository secret
```

أضف الأسرار التالية **بهذه الأسماء بالضبط**:

| اسم السر | القيمة |
|---|---|
| `GROQ_API_KEY` | مفتاح Groq |
| `SPOTIFY_CLIENT_ID` | Client ID من Spotify |
| `SPOTIFY_CLIENT_SECRET` | Client Secret من Spotify |
| `CLOUDFLARE_API_TOKEN` | التوكن الذي أنشأته في Cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | معرّف حساب Cloudflare |

⚠️ لا تضع أي من هذه القيم داخل أي ملف في المستودع. هذه الأسرار تُستخدم فقط من داخل GitHub Actions.

### د) تشغيل GitHub Actions لنشر الخادم الوسيط

1. بعد إضافة الأسرار، اذهب إلى تبويب **Actions** في المستودع.
2. اختر workflow باسم **"Deploy HABDANA API Worker"**.
3. اضغط **"Run workflow"** (أو ببساطة اعمل push لأي تعديل داخل مجلد `worker/` وسيعمل تلقائيًا).
4. عند نجاح التشغيل، افتح لوحة Cloudflare → Workers & Pages، وستجد Worker باسم `habdana-api`. انسخ رابطه، مثل:
   ```
   https://habdana-api.<your-subdomain>.workers.dev
   ```

### هـ) ربط الموقع بالخادم الوسيط

افتح ملف `config.js` وضع الرابط الذي نسخته:

```js
const WORKER_BASE_URL = "https://habdana-api.<your-subdomain>.workers.dev";
```

هذا الرابط **عام وليس سريًا** (هو مجرد عنوان API، تمامًا مثل أي رابط API عام آخر)، لذلك من الآمن حفظه مباشرة داخل `config.js` ورفعه على GitHub.

ثم اعمل commit + push لهذا التعديل.

### و) تشغيل/تفعيل GitHub Pages

يوجد خياران (أيّهما يكفي):

**الخيار 1 — الأسهل (بدون Actions):**
```
Settings → Pages → Build and deployment → Source: Deploy from a branch
Branch: main   /   root
```
احفظ، وسيصبح موقعك متاحًا خلال دقيقة على:
```
https://<username>.github.io/<repo-name>/
```

**الخيار 2 — عبر GitHub Actions (تلقائي عند كل push):**
الملف `.github/workflows/deploy-pages.yml` موجود بالفعل. فقط تأكد أنه مفعّل من تبويب **Actions**، ثم من:
```
Settings → Pages → Build and deployment → Source: GitHub Actions
```

---

## 4) كيف يعمل الموقع بدون إعداد أي شيء؟

المشروع مصمم ليعمل **مباشرة من أول لحظة** حتى قبل إعداد أي API:

- إذا لم تُعدّل `config.js` بعد (الرابط لا يزال `YOUR-WORKER-NAME...`)، فسيتم تعطيل خياري "الذكاء الاصطناعي" و"Spotify" تلقائيًا في شاشة الإعداد، وتعمل الألعاب بالأسئلة/الأغاني المحلية المخزّنة داخل `script.js` كما كانت.
- بعد إعداد `WORKER_BASE_URL` بشكل صحيح، تُفعَّل الخيارات تلقائيًا، مع الاحتفاظ بنفس القوائم المحلية كخطة احتياطية (Fallback) في حال فشل الاتصال بالإنترنت أو بأي من الخدمتين مؤقتًا.

---

## 5) فحوصات تم إجراؤها على المشروع

- ✅ الروابط بين `index.html` و `style.css` و `config.js` و `script.js` تعمل بالترتيب الصحيح (config.js يُحمَّل قبل script.js لأن `WORKER_BASE_URL` يُستخدم داخله).
- ✅ تصحيح خطأ مطبعي في `style.css` كان يمنع تعطيل الأزرار بعد الإجابة (`..answer.disabled` ← `.answer.disabled`).
- ✅ كل معرّفات (`id`) العناصر المستخدمة في `script.js` موجودة فعليًا في `index.html`.
- ✅ التحقق من صحة شكل البيانات القادمة من Groq و Spotify قبل استخدامها (لتفادي أخطاء JavaScript إذا أرجعت الخدمة شكلًا غير متوقع).
- ✅ مهلة زمنية (Timeout) لطلبات الشبكة حتى لا تتجمّد اللعبة إذا تأخر الرد.
- ✅ رجوع تلقائي (Fallback) للأسئلة/الأغاني المحلية عند أي خطأ في الشبكة أو في الخادم.
- ✅ لا يوجد أي `npm install` أو أي أداة بناء (Build Tool) مطلوبة لتشغيل الموقع نفسه — فقط الخادم الوسيط (اختياري) يحتاج `wrangler` وهو يُشغَّل تلقائيًا داخل GitHub Actions فقط.
- ✅ الواجهة عربية بالكامل مع `dir="rtl"` ومتجاوبة (Responsive) على الهاتف والكمبيوتر عبر `@media` الموجودة أصلًا في `style.css`.

---

## 6) ملاحظات أمان إضافية (اختياري لكن مستحسن)

- في `worker/wrangler.toml` القيمة `ALLOWED_ORIGIN = "*"` تسمح بالاتصال بالـ API من أي موقع. للحماية الأفضل، غيّرها إلى رابط GitHub Pages الخاص بك فقط، مثل:
  ```
  ALLOWED_ORIGIN = "https://<username>.github.io"
  ```
  ثم أعد تشغيل workflow نشر الـ Worker.
- يمكنك لاحقًا إضافة حد أقصى لعدد الطلبات (Rate Limiting) داخل Cloudflare Workers مجانًا إذا أردت حماية إضافية من إساءة الاستخدام.
