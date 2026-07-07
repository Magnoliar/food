import { PrismaClient } from '../../app/generated/prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import type { SqlDriverAdapter, SqlMigrationAwareDriverAdapterFactory } from '@prisma/driver-adapter-utils'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const SQLITE_PRAGMAS = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 10000;
PRAGMA foreign_keys = ON;
`

function withSqlitePragmas(adapter: SqlMigrationAwareDriverAdapterFactory): SqlMigrationAwareDriverAdapterFactory {
  async function configure(connection: SqlDriverAdapter) {
    await connection.executeScript(SQLITE_PRAGMAS)
    return connection
  }

  return {
    provider: adapter.provider,
    adapterName: adapter.adapterName,
    async connect() {
      return configure(await adapter.connect())
    },
    async connectToShadowDb() {
      return adapter.connectToShadowDb()
    },
  }
}

function createPrisma() {
  const dbUrl = process.env.DATABASE_URL || 'file:./dev.db'
  const adapter = withSqlitePragmas(new PrismaBetterSqlite3({
    url: dbUrl,
    timeout: 10000,
  }))
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma || createPrisma()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
