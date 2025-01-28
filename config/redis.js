import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: 'bjYoPJat4dfeDrvkLN4jM7obk6hll2hZ',
    socket: {
        host: 'redis-19139.c100.us-east-1-4.ec2.redns.redis-cloud.com',
        port: 19139
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

await client.set('foo', 'bar');
const result = await client.get('foo');
console.log(result)  // >>> bar

