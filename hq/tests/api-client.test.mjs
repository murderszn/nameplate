import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source = readFileSync(new URL('../src/api/client.ts', import.meta.url), 'utf8');
const organization = { id: 'test-org', name: 'Test portfolio' };

function client(fetch, env = {}) {
  const output = ts.transpileModule(source.replaceAll('import.meta.env', JSON.stringify(env)), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const writes = [];
  vm.runInNewContext(output, {
    exports, fetch, AbortSignal, URLSearchParams, Error,
    require: () => ({ mintNpid: () => 'NP-TEST' }),
    localStorage: { getItem: () => null, setItem: (...args) => writes.push(args) },
  });
  return { ...exports, writes };
}

const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

test('offline preview selects one consistent, observable sample source', async () => {
  let requests = 0;
  const c = client(async () => { requests++; throw new Error('offline'); });
  const statuses = [];
  const unsubscribe = c.subscribeDataSource(() => statuses.push(c.getDataSourceStatus()));
  const [properties, orders] = await Promise.all([c.api.listProperties(), c.api.listWorkOrders()]);
  assert.ok(properties.length > 0);
  assert.ok(orders.length > 0);
  assert.equal(requests, 1);
  assert.deepEqual(statuses, ['demo']);
  unsubscribe();
});

test('empty backend collections stay empty, including a property with no units', async () => {
  const c = client(async (url) => response(url.endsWith('/org') ? organization : []));
  for (const getRows of [
    () => c.api.listProperties(), () => c.api.listAssets(), () => c.api.listWorkOrders(),
    () => c.api.listServiceEvents(), () => c.api.listCategories(), () => c.api.listUsers(),
    () => c.api.listBuildings('empty-property'), () => c.api.listUnits('empty-property'),
  ]) assert.equal((await getRows()).length, 0);
  assert.equal(c.getDataSourceStatus(), 'live');
});

test('configured API failures are errors, never sample portfolios', async () => {
  const c = client(async () => { throw new Error('offline'); }, { VITE_API_URL: 'https://api.example.test/api' });
  await assert.rejects(c.api.getOrg(), /offline/);
  assert.equal(c.getDataSourceStatus(), 'unavailable');
});

test('failed connected mutations do not create local success or sample records', async () => {
  const c = client(async (url) => response(url.endsWith('/org') ? organization : {}, url.endsWith('/org') ? 200 : 500));
  await c.api.getOrg();
  await assert.rejects(c.api.createWorkOrder({ title: 'Test task' }), /save.*500/);
  await assert.rejects(c.api.updateWorkOrder('wo_1048', { status: 'completed' }), /save.*500/);
  await assert.rejects(c.api.createAsset({}), /save.*500/);
  assert.equal(c.writes.length, 0);
  assert.equal(c.getDataSourceStatus(), 'unavailable');
});

test('connected read failures remain visible and can recover on retry', async () => {
  let available = false;
  const c = client(async (url) => response(url.endsWith('/org') ? organization : [], url.endsWith('/org') || available ? 200 : 503));
  await assert.rejects(c.api.listAssets(), /load.*503/);
  assert.equal(c.getDataSourceStatus(), 'unavailable');
  available = true;
  assert.equal((await c.api.listAssets()).length, 0);
  assert.equal(c.getDataSourceStatus(), 'live');
});

test('unit details and buildings use existing backend routes', async () => {
  const paths = [];
  const c = client(async (url) => {
    paths.push(new URL(url).pathname + new URL(url).search);
    return response(url.endsWith('/org') ? organization : url.includes('/units/') ? { id: 'unit-live' } : []);
  });
  assert.equal((await c.api.getUnit('unit-live')).id, 'unit-live');
  await c.api.listBuildings('prop-live');
  assert.deepEqual(paths, ['/api/org', '/api/units/unit-live', '/api/buildings?propertyId=prop-live']);
});

test('existing backend serves the HQ portfolio and detail contracts', { skip: !process.env.HQ_INTEGRATION_API_URL }, async () => {
  const c = client(fetch, { VITE_API_URL: process.env.HQ_INTEGRATION_API_URL });
  const org = await c.api.getOrg();
  const [properties, assets, orders, events, categories] = await Promise.all([
    c.api.listProperties(org.id), c.api.listAssets(org.id), c.api.listWorkOrders(org.id),
    c.api.listServiceEvents(org.id), c.api.listCategories(),
  ]);
  for (const rows of [properties, assets, orders, events, categories]) assert.ok(Array.isArray(rows));
  if (properties.length) {
    const [units, buildings] = await Promise.all([c.api.listUnits(properties[0].id), c.api.listBuildings(properties[0].id)]);
    assert.ok(Array.isArray(buildings));
    if (units.length) assert.equal((await c.api.getUnit(units[0].id)).id, units[0].id);
  }
  if (assets.length) assert.equal((await c.api.getAsset(assets[0].id)).id, assets[0].id);
  if (orders.length) assert.equal((await c.api.getWorkOrder(orders[0].id)).id, orders[0].id);
  assert.equal(c.getDataSourceStatus(), 'live');
});
