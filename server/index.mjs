import { createAuthRuntime } from './auth.mjs';
import { createApp } from './app.mjs';
const port = Number(process.env.PORT || 8788);
const authRuntime = await createAuthRuntime();
const server = createApp({authRuntime});
server.on('close',() => {void authRuntime.pool?.end();});
server.listen(port, '0.0.0.0', () => console.log(`나를봄 API: http://localhost:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
