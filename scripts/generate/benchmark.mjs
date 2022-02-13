import { faker } from '@faker-js/faker';
import { Josh } from '@joshdb/core';
import ora from 'ora';
import { JSONProvider } from '../../packages/json/dist/index.js';
import { MongoProvider } from '../../packages/mongo/dist/index.js';

const num = 100;

function getAvg(arr) {
  return (arr.reduce((prev, curr) => (prev += curr), 0) / arr.length).toFixed(2);
}

function getMax(arr) {
  return Math.max(...arr).toFixed(2);
}

function getMin(arr) {
  return Math.min(...arr).toFixed(2);
}

function getTotal(arr) {
  return arr.reduce((prev, curr) => (prev += curr), 0).toFixed(2);
}

function getAll(arr) {
  return {
    Avg: getAvg(arr),
    Max: getMax(arr),
    Min: getMin(arr),
    Total: getTotal(arr)
  };
}

async function runMethod(name, meth, data, num = null, before = null) {
  const arrDataSpinner = ora(`${name} data`).start();

  const arr = [];

  if (num === null) {
    for (const card of data) {
      if (before) await before();

      const start = performance.now();

      await meth(card);
      arr.push(performance.now() - start);
      arrDataSpinner.text = `${name} ${arr.length}/${data.length}`;
      arrDataSpinner.render();
    }
  } else {
    for (let i = 0; i < num; i++) {
      const start = performance.now();

      await meth(data[i]);
      arr.push(performance.now() - start);
      arrDataSpinner.text = `${name} ${i + 1}/${num}`;
      arrDataSpinner.render();
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

  for (let i = 0; i < num; i++) {
    data.push({ ...faker.helpers.createCard(), id: await db.autoKey(), net: 0 });
    gatherDataSpinner.text = `Loaded ${i + 1}/${num} cards`;
    gatherDataSpinner.render();
  }

  gatherDataSpinner.succeed(`Loaded ${num} random cards`);

  const set = await runMethod('Set', (card) => db.set(card.id, card), data);

  const get = await runMethod('Get', (card) => db.get(card.id), data);

  const getRandom = await runMethod('Random', (card) => db.random(), data);

  const add = await runMethod('Math', (card) => db.math(`${card.id}.net`, '+', 1), data);

  const del = await runMethod('Delete', (card) => db.delete(card.id), data);

  const setMany = await runMethod('SetMany', (card) => db.setMany(data.map((d) => [{ key: d.id }, d])), data, 5);

  const delMany = await runMethod('DelMany', (card) => db.deleteMany(data.map((d) => d.id)), data, 1);

  const clear = await runMethod(
    'Clear',
    () => db.clear(),
    data,
    num,
    () => db.setMany(data.map((d) => [{ key: d.id }, d]))
  );

  console.log(name);
  console.table({
    Set: getAll(set),
    Get: getAll(get),
    Del: getAll(del),
    Math: getAll(add),
    Random: getAll(getRandom),
    SetMany: getAll(setMany),
    DelMany: getAll(delMany),
    Clear: getAll(clear)
  });
}

const mongoDb = new Josh({
  name: 'benchjosh',
  provider: new MongoProvider({
    collectionName: 'benchjosh'
  })
});

const jsonDb = new Josh({
  name: 'benchjosh',
  provider: new JSONProvider({
    dataDirectoryName: '.bench'
  })
});

void (async () => {
  await runDbTest('MongoDB', mongoDb);
  await runDbTest('Json', jsonDb);
  process.exit();
})();
