const noble = require('noble');
const {service_uuids} = require('./consts');
const bluebird = require('bluebird');

module.exports = function (deviceName) {
    return new Promise((resolve) => {
        function maybeStartScan() {
            console.log(noble.state);
            if (noble.state == 'poweredOn') {
                noble.startScanning(service_uuids, true);
            }
        }

        const stateChangeCb = (state) => {
            console.log('state: ' + state);
            maybeStartScan();
        };
        const discoverCb = (peripheral) => {
            if (peripheral.advertisement.localName === deviceName) {
                noble.stopScanning();
                noble.removeListener('stateChange', stateChangeCb);
                noble.removeListener('discover', discoverCb);
                resolve(bluebird.promisifyAll(peripheral));
            }
        };
        noble.on('stateChange', stateChangeCb);
        noble.on('discover', discoverCb);
        maybeStartScan();
    });
};
