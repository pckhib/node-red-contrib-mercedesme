module.exports = function (RED) {
    function MercedesMeConfig(config) {
        RED.nodes.createNode(this, config);

        this.clientId = config.clientId;
        this.clientSecret = config.clientSecret;
    }
    RED.nodes.registerType('Mercedes-Me-Config', MercedesMeConfig);
    
    function MercedesMeNode(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        var MercedesMeConnect = require('mercedes-me-connect-js');

        this.clientConfig = RED.nodes.getNode(config.clientConfig);

        var app = new MercedesMeConnect(this.clientConfig.clientId, this.clientConfig.clientSecret);
        app.init().then(() => {
            node.status({ fill: 'green', shape: 'dot', text: 'connected' });
        });

        node.on('input', function (msg) {
            switch (msg.payload.function) {
                case 'getVehicles':
                    msg.payload.vehicles = await app.getVehicles();
                    return msg;
                case 'getVehicle':
                    msg.payload.vehicle = await app.getVehicleById(msg.payload.vehicleId);
                    return msg;
                case 'getTires':
                    msg.payload.tires = await app.getTires(msg.payload.vehicleId);
                    return msg;
                case 'getDoors':
                    msg.payload.doors = await app.getDoors(msg.payload.vehicleId);
                    return msg;
                case 'setDoors':
                    msg.payload.doors = await app.setDoors(msg.payload.vehicleId, msg.payload.state);
                    return msg;
                case 'getLocation':
                    msg.payload.location = await app.getLocation(msg.payload.vehicleId);
                    return msg;
                case 'getOdometer':
                    msg.payload.odometer = await app.getOdometer(msg.payload.vehicleId);
                    return msg;
                case 'getFuel':
                    msg.payload.fuel = await app.getFuel(msg.payload.vehicleId);
                    return msg;
                case 'getCharge':
                    msg.payload.charge = await app.getCharge(msg.payload.vehicleId);
                    return msg;
                default:
                    msg.payload = 'Function not found';
                    return msg;
            }
        });
    }
    RED.nodes.registerType('Mercedes-Me', MercedesMeNode);
}