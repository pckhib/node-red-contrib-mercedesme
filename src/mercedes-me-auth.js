module.exports = function (RED) {
    const request = require('request');
    const fs = require('fs');

    function MercedesMeOAuth2(config) {
        RED.nodes.createNode(this, config);

        this.name = config.name;
        this.client_id = this.credentials.client_id;
        this.client_secret = this.credentials.client_secret;

        const auth = {
            tokenHost: 'https://api.secure.mercedes-benz.com',
            tokenPath: '/oidc10/auth/oauth/v2/token',
            authorizePath: '/oidc10/auth/oauth/v2/authorize'
        }

        const id = this.id;

        this.status({ fill: 'red', shape: 'ring', text: 'unauthorized' });

        const node = this;

        node.getAuthorizationUrl = (protocol, hostname, port, client_id) => {
            node.status({ fill: 'yellow', shape: 'ring', text: 'authorizing...' });

            let callbackUrl = protocol + '//' + hostname + (port ? ':' + port : '')
                + '/mercedesme/oauth2/auth/callback';

            node.context().set('callback_url', callbackUrl);

            return auth.tokenHost + auth.authorizePath + 
                '?client_id=' + client_id + 
                '&scope=mb:vehicle:status:general%20mb:user:pool:reader' +
                '&response_type=code&redirect_uri=' + callbackUrl;
        };

        node.getTokens = (authCode) => {
            let n = RED.nodes.getNode(id);
            const encodedClientId = Buffer.from(n.client_id + ':' + n.client_secret).toString('base64');
            request.post({
                headers: {
                    'content-type' : 'application/x-www-form-urlencoded',
                    'authorization': 'Basic ' + encodedClientId
                },
                url: auth.tokenHost + auth.tokenPath,
                body: 'grant_type=authorization_code&code=' + authCode + '&redirect_uri=' + n.context().get('callback_url')
            }, (error, response, body) => {
                if (error || response.statusCode != 200) {
                    return;
                }

                n.status({ fill: 'green', shape:'dot', text: 'authorized' });

                n.tokens = { ...JSON.parse(body), timestamp: Date.now() };
                
                fs.writeFile('mercedesme_tokens.json', JSON.stringify(n.tokens), (err) => {
                    if (err) {
                        console.log(err);
                    }
                });

                n.send({
                    topic: 'oauth2',
                    payload: {
                        access_token: n.tokens.access_token
                    }
                });
            });
        }

        node.refreshTokens = () => {
            let n = RED.nodes.getNode(id);
            const encodedClientId = Buffer.from(n.client_id + ':' + n.client_secret).toString('base64');
            request.post({
                headers: {
                    'content-type' : 'application/x-www-form-urlencoded',
                    'authorization': 'Basic ' + encodedClientId
                },
                url: auth.tokenHost + auth.tokenPath,
                body: 'grant_type=refresh_token&refresh_token=' + n.tokens.refresh_token
            }, (error, response, body) => {
                if (error || response.statusCode != 200) {
                    return;
                }

                n.status({ fill: 'green', shape:'dot', text: 'authorized' });

                n.tokens = { ...JSON.parse(body), timestamp: Date.now() };
                
                fs.writeFile('mercedesme_tokens.json', JSON.stringify(n.tokens), (err) => {
                    if (err) {
                        console.log(err);
                    }
                });

                n.send({
                    topic: 'oauth2',
                    payload: {
                        access_token: n.tokens.access_token
                    }
                });
            });
        };

        node.loadTokenFile = () => {
            try {
            let content = fs.readFileSync('mercedesme_tokens.json', 'utf8');
            node.tokens = JSON.parse(content);

            if (node.tokens != undefined) {
                node.refreshTokens();
            }
            } catch (err) {

            }
        };

        RED.events.on("nodes-started", () => {
            node.loadTokenFile();
        });

        RED.httpAdmin.get('/mercedesme/oauth2/auth/callback', (req, res) => {
            let n = RED.nodes.getNode(id);
            n.getTokens(req.query.code);
            res.sendStatus(200);
        });
    }
    RED.nodes.registerType('MercedesMeOAuth2', MercedesMeOAuth2, {
        credentials: {
            client_id: { type: 'text' },
            client_secret: { type: 'text' }
        }
    });

    RED.httpAdmin.get('/mercedesme/oauth2/:id/auth/url', (req, res) => {
        if (!req.query.protocol || !req.query.hostname || !req.query.port) {
            res.sendStatus(400);
            return;
        }

        let node = RED.nodes.getNode(req.params.id);
        if (!node) {
            res.sendStatus(404);
            return;
        }

        let client_id = node.client_id;

        const url = node.getAuthorizationUrl(req.query.protocol, req.query.hostname, req.query.port, client_id);
        res.send({
            'url': url
        });
    });
}