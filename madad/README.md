# مَدَد | MADAD
## Hajj Field Resource & Operations Orchestration Platform

مَدَد منصة تشغيل ميداني تنسّق البلاغات والفرق والمعدات والمخزون في المشاعر. قلب النظام هو **Dispatch Engine** يقيّم كل فرقة لكل بلاغ بدرجة من 100، ثم يقترح الفرقة الأنسب والأقرب مع تفسير تفصيلي للدرجة.

## المكونات
- Next.js 15 + React 19 + TypeScript frontend
- Express 5 + TypeScript backend
- PostgreSQL 16
- Prisma 6.19 pinned intentionally for stable classic datasource configuration
- JWT + RBAC
- Socket.IO realtime events
- Zod validation
- Docker Compose for local PostgreSQL

## التشغيل المحلي لأول مرة
1. انسخ `apps/api/.env.example` إلى `apps/api/.env`.
2. انسخ `apps/web/.env.local.example` إلى `apps/web/.env.local`.
3. من جذر المشروع:

```bash
npm install
npm run db:generate
docker compose up -d
npm run db:push
npm run db:seed
npm run build
npm run dev
```

الخدمات:
- Web: http://localhost:3000
- API Health: http://localhost:4000/api/v1/health
- PostgreSQL host port: 5433

حساب العرض:
- `admin@madad.sa`
- `Madad@123`

## Dispatch Score /100
- Availability: 25
- Specialization: 22
- Required skills: 20
- Proximity: 18
- Workload: 10
- Same site/zone: 5

عند تساوي الدرجات، تُفضّل الفرقة الأقرب ثم الأقل ETA. الفرق غير المتاحة يتم خفض سقف درجتها لتجنب اقتراحها كخيار أول.

## النشر
### Backend + Database — Render
أنشئ PostgreSQL ثم Web Service من نفس المستودع:
- Root Directory: `apps/api`
- Runtime: Node
- Build Command: `npm install && npx prisma generate && npm run build`
- Start Command: `npm start`

Environment:
- `DATABASE_URL` = Render PostgreSQL Internal Database URL
- `JWT_ACCESS_SECRET` = secret طويل
- `JWT_REFRESH_SECRET` = secret مختلف
- `JWT_ACCESS_EXPIRES=15m`
- `JWT_REFRESH_EXPIRES_DAYS=7`
- `WEB_ORIGIN` = رابط Vercel بعد نشر الواجهة

بعد أول نشر فقط، من Render Shell:
```bash
npx prisma db push
npm run db:seed
```
لا تجعل `db:seed` يعمل في كل نشر لأنه يعيد بيانات العرض.

### Frontend — Vercel
Import نفس GitHub repository:
- Root Directory: `apps/web`
- Framework: Next.js
- `NEXT_PUBLIC_API_URL=https://YOUR-API.onrender.com/api/v1`
- `NEXT_PUBLIC_SOCKET_URL=https://YOUR-API.onrender.com`

بعد ظهور رابط Vercel، ضعه في `WEB_ORIGIN` داخل Render ثم أعد نشر الـAPI.

## ملاحظة Prisma
المشروع يثبت Prisma و`@prisma/client` على **6.19.0** بشكل صريح. لذلك وجود `url = env("DATABASE_URL")` داخل `schema.prisma` صحيح لهذا المشروع. لا تشغّل `npm audit fix --force` ولا ترقي Prisma إلى 7 قبل التسليم؛ ذلك يحتاج migration خاص بإعداد Prisma 7.
