module.exports = function (RED) {
    const SwaggerClient = require('swagger-client');
    const request = require('request');
    const fs = require('fs');

    function MercedesMeRequest(config) {
        RED.nodes.createNode(this, config);

        this.name = config.name;
        this.action = config.action;
        this.vehicleId = config.vehicleId;
        this.command = config.command;

        const apiUrl = __dirname + '\\swagger_experimental_connected_vehicle_api_3.json';

        this.status({ fill: 'red', shape: 'ring', text: 'wait for client' });

        const node = this;

        node.on('input', msg => {
            if (msg.topic === 'oauth2') {
                node.context().set('access_token', msg.payload.access_token);
                node.getSwaggerClient();
            } else {

                node.makeRequest(node.action)
                .then(response => {
                    node.send({
                        payload: response.data
                    });
                })
                .catch(error => {
                    node.send({
                        error: error
                    });
                });
            }
        });

        node.makeRequest = (action) => {
            switch (action) {
                case 'getAllVehicles':
                    return node.client.apis.Vehicles.getAllVehicles();
                case 'getVehicleById':
                    return node.client.apis.Vehicles.getVehicleById({ vehicleId: node.vehicleId });
                case 'getTiresStatus':
                    return node.client.apis.Tires.getTiresStatus({ vehicleId: node.vehicleId });
                case 'getDoorsStatus':
                    return node.client.apis.Doors.getDoorsStatus({ vehicleId: node.vehicleId });
                case 'postDoors':
                    return new Promise((resolve, reject) => {
                        request.post({
                            headers: {
                                'content-type' : 'application/json',
                                'authorization': 'Bearer ' + node.context().get('access_token')
                            },
                            url: 'https://api.mercedes-benz.com/experimental/connectedvehicle/v1/vehicles/' + node.vehicleId + '/doors',
                            body: '{ \"command\": \"' + node.command + '\"}'
                        }, (error, response, body) => {
                            if (error) {
                                reject(error);
                            }
                            resolve({ data: body });
                        });
                    });
                case 'getLocation':
                    return node.client.apis.Location.getLocation({ vehicleId: node.vehicleId });
                case 'getOdometerStatus':
                    return node.client.apis.Odometer.getOdometerStatus({ vehicleId: node.vehicleId });
                case 'getFuelLevel':
                    return node.client.apis.Fuel.getFuelLevel({ vehicleId: node.vehicleId });
                case 'getStateOfCharge':
                    return node.client.apis['State of Charge']['getStateOfCharge']({ vehicleId: node.vehicleId });
            }
        };

        node.getSwaggerClient = () => {
            if (node.context().get('access_token') != undefined) {
                SwaggerClient({
                    spec: JSON.parse(fs.readFileSync(apiUrl, 'utf8')),
                    requestInterceptor: req => {
                        req.headers['accept'] = 'application/json',
                        req.headers['authorization'] = 'Bearer ' + node.context().get('access_token')
                    }
                })
                .then(client => {
                    node.client = client;
                    node.status({ fill: 'green', shape: 'dot', text: 'ready' });
                })
                .catch(error => {
                    console.log(error);
                });
            }
        };
    }
    RED.nodes.registerType('MercedesMeRequest', MercedesMeRequest);
};