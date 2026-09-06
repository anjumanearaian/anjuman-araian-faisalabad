// Exercises the actual Vercel entry module locally. Database is isolated;
// Vercel edge routing and production email delivery require a deployed check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const esbuild = require('esbuild');
process.env.VERCEL = '1';
process.env.JWT_SECRET = 'local-entry-smoke-test-only';
delete process.env.DATABASE_URL;
global.__entryDb = { admin: { count: async () => 1 } };
(async () => {
  await esbuild.build({entryPoints:['api/index.ts'], outfile:'tests/api-entry-bundle.cjs',bundle:true,platform:'node',packages:'external',plugins:[{
    name:'isolated-db', setup(build) {
      build.onResolve({filter:/\/lib\/prisma$/}, args => ({path:args.path,namespace:'double'}));
      build.onLoad({filter:/.*/,namespace:'double'}, () => ({contents:'const prisma=globalThis.__entryDb; export {prisma}; export default prisma;'}));
    }
  }]});
  const app = require('./api-entry-bundle.cjs').default;
  assert.equal(typeof app,'function');
  const server = app.listen(0,'127.0.0.1'); await new Promise(resolve=>server.once('listening',resolve));
  const root=`http://127.0.0.1:${server.address().port}`;
  try {
    let r = await fetch(root+'/api/health'); assert.equal(r.status,503);
    assert.equal((await r.json()).version,'5.0.2-routing-fix');
    r = await fetch(root+'/api/auth/email/request-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'invalid'})});
    assert.equal(r.status,400); assert.match((await r.json()).error,/valid email/);
    r = await fetch(root+'/api/auth/email/verify-otp',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,400);
    r = await fetch(root+'/api/auth/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(r.status,400);
    r = await fetch(root+'/api/missing');assert.equal(r.status,404);assert.match((await r.json()).error,/API endpoint not found/);
    const config = JSON.parse(fs.readFileSync('vercel.json','utf8'));
    assert.deepEqual(config.rewrites[0],{source:'/api/:path*',destination:'/api'});
    console.log('PASS: actual API entry boots; health, OTP request/verify, admin login and JSON 404 routes respond; API rewrite precedes SPA fallback. Local test with mock database, not live Vercel.');
  } finally {await new Promise(resolve=>server.close(resolve));fs.unlinkSync('tests/api-entry-bundle.cjs');}
})().catch(error=>{console.error(error);process.exitCode=1;});
