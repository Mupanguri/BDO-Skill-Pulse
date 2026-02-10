import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './schema.prisma',
  migrations: {
    directory: './migrations',
    url: 'file:./dev.db'
  }
});