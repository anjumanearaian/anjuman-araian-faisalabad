// Isolated payment destination tests. No production requests or payments.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const esbuild = require('esbuild');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

const bundle = path.join(__dirname, `payment-test-${process.pid}.cjs`);
const originalFetch = global.fetch;
const originalStorage = global.sessionStorage;
let handler;
const requests = [];
global.sessionStorage = { getItem: () => null };
global.fetch = async (url, options) => {
  requests.push({ url, options });
  return handler(url, options);
};
const response = (value) => new Response(JSON.stringify(value), { status: 200 });
const account = (id, bankName, accountNo) => ({ id, bankName, accountNo, accountTitle: 'Payment test account' });
const first = account('one', 'Test Bank One', 'TEST11112222');
const second = account('two', 'Test Wallet Two', 'TEST33334444');

(async () => {
  try {
    await esbuild.build({
      stdin: { contents: 'export * from "./src/app/lib/settingsStore"; export * from "./src/app/components/PaymentInstructions";', resolveDir: process.cwd(), loader: 'tsx' },
      outfile: bundle, bundle: true, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
    });
    const store = require(bundle);
    const render = (status = 'ready') => renderToStaticMarkup(React.createElement(store.PaymentInstructions, {
      settings: store.getSiteSettings(), status, onRetry: () => {}, onSelectMethod: () => {},
    }));

    assert.deepEqual(store.getSiteSettings().paymentMethods, [], 'never show default/demo accounts');
    handler = () => response({ paymentMethods: [first, second] });
    await Promise.all([store.fetchSiteSettings(), store.fetchSiteSettings({ throwOnError: true })]);
    assert.equal(requests.length, 1, 'deduplicate concurrent settings reads');
    assert.equal(requests[0].options.cache, 'no-store', 'request current admin settings');
    assert.match(render(), /TEST11112222/);
    assert.match(render(), /TEST33334444/);
    assert.match(render(), /Account title/);
    assert.match(render(), /Copy number \/ IBAN/);

    let updates = 0;
    const unsubscribe = store.subscribeSiteSettings(() => { updates++; });
    const edited = { ...second, accountNo: 'TEST55556666' };
    handler = (_, options) => response(JSON.parse(options.body));
    await store.updateSiteSettings({ paymentMethods: [edited] });
    assert.equal(updates, 1, 'admin save notifies mounted forms');
    assert.match(render(), /TEST55556666/);
    assert.doesNotMatch(render(), /TEST11112222|TEST33334444/, 'edited and removed accounts disappear');

    // A GET that began before a completed admin save cannot restore old details.
    let releaseRead;
    handler = (_, options) => options.method === 'PUT'
      ? response(JSON.parse(options.body))
      : new Promise((resolve) => { releaseRead = resolve; });
    const staleRead = store.fetchSiteSettings({ throwOnError: true });
    await store.updateSiteSettings({ paymentMethods: [first] });
    releaseRead(response({ paymentMethods: [second] }));
    await staleRead;
    assert.equal(store.getSiteSettings().paymentMethods[0].id, 'one');

    handler = () => response({ paymentMethods: [second] });
    await store.fetchSiteSettings({ throwOnError: true });
    assert.match(render(), /TEST33334444/, 'refresh receives changes made in another session');
    assert.doesNotMatch(render(), /TEST11112222/);

    handler = () => { throw new Error('offline'); };
    await assert.rejects(store.fetchSiteSettings({ throwOnError: true }));
    assert.match(render('error'), /Retry payment details/);
    assert.doesNotMatch(render('error'), /TEST33334444/, 'failed refresh does not display cached payment accounts');
    assert.match(render('loading'), /Loading official payment details/);
    assert.doesNotMatch(render('loading'), /TEST33334444/);

    handler = () => response({ paymentMethods: [] });
    await store.fetchSiteSettings({ throwOnError: true });
    assert.match(render(), /contact the office for deposit instructions/);
    assert.doesNotMatch(render(), /TEST33334444/);

    handler = () => response({ paymentMethods: [
      first, { ...second, accountTitle: '' }, account('demo', 'Demo Bank', '0123456789'),
    ] });
    await store.fetchSiteSettings({ throwOnError: true });
    assert.deepEqual(store.getSiteSettings().paymentMethods, [first], 'incomplete/demo accounts stay hidden');
    unsubscribe();
    console.log('PASS: payment account rendering, admin updates, deletions, concurrent requests, stale-read protection and unavailable-details states.');
  } finally {
    global.fetch = originalFetch;
    global.sessionStorage = originalStorage;
    fs.rmSync(bundle, { force: true });
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
