const redis = require('redis');
const xsenv = require('@sap/xsenv');
const express = require('express')

xsenv.loadEnv();
const svc = xsenv.serviceCredentials({ label: 'redis-cache' });
let oClient;
if (svc.cluster_mode) {
    const opts = {
        rootNodes: [{ url: svc.uri }], // The uri contains the protocol (e.g. rediss:// indicating tls) and password information, making the root node connection work
        defaults: {
            password: svc.password, // password must be set in the default options to make the connections to the cluster nodes work (it does not inherit from the root node uri)
            socket: {
                tls: svc.tls, // tls must also be set in the defaults for the cluster node connections to work - note that the connection stalls if this is not provided (no error message, just blocks indefinately)
            },
        }
    };
    oClient = redis.createCluster(opts);  
} else {
    const opts = {
        url: svc.uri, // The uri contains the protocol (e.g. rediss:// indicating tls) and password information, which is sufficient for single-node scenarios
    }
    oClient = redis.createClient(opts);
}

oClient.connect().then(() => {
    const app = express();
    app.use(express.json());
    const port = process.env.PORT || 4000;

    app.get('/:key', async (req, res) => {
        res.json(JSON.parse(await oClient.get(req.params.key)));
    });

    app.post('/:key', async (req, res) => {
        await oClient.set(req.params.key, JSON.stringify(req.body));
        res.send('ok');
    });

    app.listen(port, () => {
        console.log(`Listening on port ${port}`)
    });
});
