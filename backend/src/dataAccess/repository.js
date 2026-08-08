import fs from 'node:fs/promises';
import path from 'node:path';
import { dataDirectory, ensureDataDirectory, tableName, useAws } from '../config.js';

class LocalJsonRepository {
  constructor(table) {
    this.table = table;
    this.filePath = path.join(dataDirectory, `${table}.json`);
  }

  async initialize() {
    await ensureDataDirectory();
    try {
      await fs.access(this.filePath);
    } catch {
      await fs.writeFile(this.filePath, '[]', 'utf8');
    }
  }

  async readAll() {
    await this.initialize();
    const raw = await fs.readFile(this.filePath, 'utf8');

    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn(`Resetting malformed JSON store for ${this.filePath}`);
      await fs.writeFile(this.filePath, '[]', 'utf8');
      return [];
    }
  }

  async writeAll(items) {
    await this.initialize();
    await fs.writeFile(this.filePath, JSON.stringify(items, null, 2), 'utf8');
  }

  async getById(id) {
    const items = await this.readAll();
    return items.find((item) => item.id === id) || null;
  }

  async list() {
    return this.readAll();
  }

  async create(item) {
    const items = await this.readAll();
    items.push(item);
    await this.writeAll(items);
    return item;
  }

  async update(id, updates) {
    const items = await this.readAll();
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) {
      return null;
    }

    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    await this.writeAll(items);
    return items[index];
  }

  async delete(id) {
    const items = await this.readAll();
    const filtered = items.filter((item) => item.id !== id);
    await this.writeAll(filtered);
    return filtered.length !== items.length;
  }

  async queryByField(field, value) {
    const items = await this.readAll();
    return items.filter((item) => item[field] === value);
  }

  async scan(predicate) {
    const items = await this.readAll();
    return items.filter(predicate);
  }
}

class AwsDynamoRepository {
  constructor(table) {
    this.table = table;
  }

  async getById() {
    throw new Error('AWS DynamoDB integration is not configured in this MVP foundation.');
  }

  async list() {
    throw new Error('AWS DynamoDB integration is not configured in this MVP foundation.');
  }

  async create() {
    throw new Error('AWS DynamoDB integration is not configured in this MVP foundation.');
  }

  async update() {
    throw new Error('AWS DynamoDB integration is not configured in this MVP foundation.');
  }

  async delete() {
    throw new Error('AWS DynamoDB integration is not configured in this MVP foundation.');
  }

  async queryByField() {
    throw new Error('AWS DynamoDB integration is not configured in this MVP foundation.');
  }

  async scan() {
    throw new Error('AWS DynamoDB integration is not configured in this MVP foundation.');
  }
}

export function createRepository(resourceName) {
  const name = tableName(resourceName);
  return useAws ? new AwsDynamoRepository(name) : new LocalJsonRepository(name);
}
