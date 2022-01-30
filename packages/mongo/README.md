<div align="center">

![Josh Logo](https://evie.codes/josh-light.png)

# @joshdb/mongo

**A provider for `@joshdb/core`**

[![GitHub](https://img.shields.io/github/license/RealShadowNova/joshdb-providers)](https://github.com/RealShadowNova/joshdb-providers/blob/main/LICENSE)
[![npm](https://img.shields.io/npm/v/@joshdb/mongo?color=crimson&logo=npm&style=flat-square&label=@joshdb/mongo)](https://www.npmjs.com/package/@joshdb/mongo)

</div>

## Description

Want to safely store your data in a mongo database? This is the package for you.

## Features

- Written in TypeScript
- Offers CommonJS and ESM bundles
- Fully tested

## Installation

### Using Yarn

```bash
yarn add @joshdb/mongo
```

### Using NPM

```bash
npm i @joshdb/mongo
```

## Provider Options

```typescript
interface Options {

		/**
	 	* The name of the mongoose collection to use
	 	*/
		collectionName?: string;
		
		/**
	 	* Sanitize collection name
	 	*/
		enforceCollectionName?: boolean;

		/**
	 	* Authentication for the database if needed
	 	*/
		authentication?: Partial<Authentication> | string;

}
interface Authentication {
		user?: string;

		password?: string;

		dbName: string;

		port: number;

		host: string;
}
```
