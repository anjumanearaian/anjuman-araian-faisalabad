// Real HTTP/router tests with isolated database and email doubles. No real emails sent.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const esbuild = require('esbuild');
const express = require('express');
const jwt = require('jsonwebtoken');
let records = [], configured = true, deliveryFails = false, deliveredCode = '', id = 0;
const db = {
  $executeRaw: async () => 1,
  emailOtp: {
    findFirst: async ({where}) => records.filter(r => r.email === where.email).at(-1) || null,
    create: async ({data}) => { const r = {id: String(++id), createdAt: new Date(), attempts: 0, consumedAt: null, ...data}; records.push(r); return r; },
    updateMany: async ({where, data}) => {records.filter(r => r.email === where.email && !r.consumedAt).forEach(r => Object.assign(r, data)); return {count: 1};},
    update: async ({where, data}) => {const r = records.find(r => r.id === where.id); const {attempts, ...rest} = data; Object.assign(r, rest); if(attempts) r.attempts += attempts.increment; return r;},
  },
  authUser: {upsert: async ({where}) => ({id: 'applicant-test', email: where.email, name: null})},
  member: {findUnique: async () => null},
};
db.$transaction = async fn => fn(db);
global.__authDb = db;
global.__authMail = {
  emailConfigured: () => configured,
  emailFrame: (_, body) => body,
  sendEmail: async (_, subject, html) => {if(deliveryFails) throw Object.assign(new Error('rejected'), {code:'EAUTH'}); deliveredCode = html.match(/>(\d{6})</)[1]; return {sent:true};},
};
process.env.JWT_SECRET = 'regression-only-random-secret-not-for-deployment';
(async () => {
  await esbuild.build({entryPoints:['backend/routes/auth.ts'], outfile:'tests/auth-test-bundle.cjs', bundle:true, platform:'node', packages:'external', plugins:[{
    name:'isolated-services', setup(build) {
      build.onResolve({filter:/^\.\.\/lib\/(prisma|email)$/}, args => ({path:args.path, namespace:'double'}));
      build.onLoad({filter:/.*/, namespace:'double'}, args => ({contents: args.path.endsWith('prisma') ? 'export default globalThis.__authDb;' : 'export const {emailConfigured, emailFrame, sendEmail} = globalThis.__authMail;'}));
    }
  }]});
  const app = express(); app.use(express.json()); app.use('/api/auth', require('./auth-test-bundle.cjs').default);
  app.use((err,req,res,next) => res.status(err.status || 500).json({error:err.message}));
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening',resolve));
  let passed = 0;
  const check = (value, expected) => {assert.equal(value,expected); passed++;};
  async function post(route, body) { const r = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/${route}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); return {status:r.status, data:await r.json()}; }
  const request = email => post('email/request-otp',{email});
  const verify = (email,code) => post('email/verify-otp',{email,code});
  try {
    check((await request('bad')).status,400);
    configured = false; check((await request('a@example.com')).status,503); configured = true;
    const sent = await request(' A@Example.com '); check(sent.status,200); check(records[0].email,'a@example.com'); check(records[0].codeHash.includes(deliveredCode),false); check('devOtp' in sent.data,false);
    check((await request('a@example.com')).status,429);
    check((await verify('a@example.com','000000')).status,400);
    const valid = await verify('a@example.com',deliveredCode); check(valid.status,200); check(jwt.verify(valid.data.token,process.env.JWT_SECRET).role,'applicant'); check(valid.data.member,null);
    check((await verify('a@example.com',deliveredCode)).status,400);
    await request('expired@example.com'); records.at(-1).expiresAt = new Date(0); check((await verify('expired@example.com',deliveredCode)).status,400);
    await request('attempts@example.com'); for(let i=0;i<5;i++) await verify('attempts@example.com','000000'); check((await verify('attempts@example.com',deliveredCode)).status,400);
    await request('resend@example.com'); const oldCode = deliveredCode; records.at(-1).createdAt = new Date(Date.now()-61000); await request('resend@example.com'); check(records.at(-2).consumedAt instanceof Date,true); check((await verify('resend@example.com',deliveredCode)).status,200);
    deliveryFails = true; check((await request('failed@example.com')).status,502); check(records.at(-1).consumedAt instanceof Date,true);
    check((await post('google',{credential:'invalid'})).status,503);
    console.log(`PASS: ${passed} auth assertions (mock DB/SMTP; real HTTP, hashing and JWT).`);
  } finally { await new Promise(resolve => server.close(resolve)); fs.unlinkSync('tests/auth-test-bundle.cjs'); }
})().catch(error => {console.error(error); process.exitCode=1;});
