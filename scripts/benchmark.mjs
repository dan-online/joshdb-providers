import { faker } from '@faker-js/faker';
import { Josh } from '@joshdb/core';
import ora from 'ora';
import { JSONProvider } from '../packages/json/dist/index.js';
import { MongoProvider } from '../packages/mongo/dist/index.js';

const cardCount = 1000;
const showUpdates = true; // slightly more performance when false

function getAverage(arr) {
  return `${(arr.reduce((prev, curr) => (prev += curr), 0) / arr.length).toFixed(2)}μs`;
}

function getMax(arr) {
  return `${Math.max(...arr).toFixed(2)}μs`;
}

function getMin(arr) {
  return `${Math.min(...arr).toFixed(2)}μs`;
}

function getTotal(arr) {
  return `${arr.reduce((prev, curr) => (prev += curr), 0).toFixed(2)}μs`;
}

function getAll(arr) {
  return {
    Average: getAverage(arr),
    Max: getMax(arr),
    Min: getMin(arr),
    Total: getTotal(arr)
  };
}

async function runMethod(name, meth, data, forcedCount = null, before = null) {
  const arrDataSpinner = ora(`${name} 0/${forcedCount || data.length}`).start();

  const arr = [];

  if (forcedCount === null) {
    for (const card of data) {
      if (before) await before();

      const start = performance.now();

      await meth(card);
      arr.push(performance.now() - start);
      arrDataSpinner.text = `${name} ${arr.length}/${data.length}`;

      if (showUpdates) arrDataSpinner.render();
    }
  } else {
    for (let i = 0; i < forcedCount; i++) {
      const start = performance.now();

      await meth(data[i]);
      arr.push(performance.now() - start);
      arrDataSpinner.text = `${name} ${i + 1}/${forcedCount}`;

      if (showUpdates) arrDataSpinner.render();
    }
  }

  arrDataSpinner.succeed(`${name} data`);

  return arr;
}

async function runDbTest(name, db) {
  const data = [];
  const loadDatabaseSpinner = ora('Loading database').start();

  await db.init();
  await db.clear();
  loadDatabaseSpinner.succeed();

  const gatherDataSpinner = ora('Gathering data').start();

  for (let i = 0; i < cardCount; i++) {
    data.push({ ...faker.helpers.createCard(), id: await db.autoKey(), net: 0 });
    gatherDataSpinner.text = `Loaded ${i + 1}/${cardCount} cards`;

    if (showUpdates) gatherDataSpinner.render();
  }

  gatherDataSpinner.succeed(`Loaded ${cardCount} random cards`);

  const set = await runMethod('Set', (card) => db.set(card.id, card), data);

  const get = await runMethod('Get', (card) => db.get(card.id), data);

  const getRandom = await runMethod('Random', () => db.random(), data);

  const add = await runMethod('Math', (card) => db.math(`${card.id}.net`, '+', 1), data);

  const del = await runMethod('Delete', (card) => db.delete(card.id), data);

  const setMany = await runMethod('SetMany', () => db.setMany(data.map((d) => [{ key: d.id }, d])), data, 5);

  const delMany = await runMethod('DeleteMany', () => db.deleteMany(data.map((d) => d.id)), data, 1);

  const clear = await runMethod(
    'Clear',
    () => db.clear(),
    data,
    cardCount,
    () => db.setMany(data.map((d) => [{ key: d.id }, d]))
  );

  console.log('\n');
  ora(name).succeed();
  console.table({
    Set: getAll(set),
    Get: getAll(get),
    Delete: getAll(del),
    Math: getAll(add),
    Random: getAll(getRandom),
    SetMany: getAll(setMany),
    DeleteMany: getAll(delMany),
    Clear: getAll(clear)
  });
}

const mongoDb = new Josh({
  name: 'bench-josh',
  provider: new MongoProvider({
    collectionName: 'bench-josh'
  })
});

const jsonDb = new Josh({
  name: 'bench-josh',
  provider: new JSONProvider({
    dataDirectoryName: '.bench'
  })
});

void (async () => {
  await runDbTest('MongoDB', mongoDb);
  await runDbTest('JSON', jsonDb);
  process.exit();
})();
