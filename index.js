const noble = require('noble');
const findMuki = require('./find-muki');
const {tx_characteristic_uuids} = require('./consts');
const bluebird = require('bluebird');

noble.on('warn', (warning) => {
    console.warn(warning);
});

function findTransmitCharacteristic(muki) {
    return muki.discoverAllServicesAndCharacteristicsAsync().then((services) => {
        let txChar = null;
        services.forEach((service) => {
            service.characteristics.forEach((char) => {
                if (tx_characteristic_uuids.indexOf(char.uuid) > -1) {
                    txChar = char;
                }
            });
        });
        return bluebird.promisifyAll(txChar);
    });
}


function writeInChunks(txChar, buffer, chunkSize = 20) {
    const chunks = [];
    for (var start = 0; start < buffer.length; start += chunkSize) {
        chunks.push(buffer.slice(start, start + chunkSize));
    }

    return new Promise((resolve) => {
        const sendNextChunk = function () {
            console.log('sending chunk, ' + chunks.length + ' left');
            const chunk = chunks.shift();
            if (!chunk) return resolve();
            console.log('chunk len', chunk.length);
            txChar.write(chunk, true);
            setTimeout(sendNextChunk, 10);
        };
        sendNextChunk();
    });
}

findMuki('PAULIG_MUKI_3F32CC').then((muki) => {
    let tx = null;
    console.log('discovered ' + muki);
    return muki.connectAsync().then(() => {
        console.log('state ' + muki.state);
        return findTransmitCharacteristic(muki);
    }).then((txChar) => {
        if (!txChar) throw new Error('no transmit characteristic found');
        tx = txChar;
    }).then(() => {
        console.log('sending clear');
        tx.writeAsync(Buffer.from([0x63]), false);
        return bluebird.delay(1500); // TODO: hack
    }).then(() => {
        if(muki.state !== 'connected') {
            console.log('reconnecting');
            return muki.connectAsync();
        }
    }).then(() => {
        console.log('sending start transmit');
        tx.writeAsync(Buffer.from([116]), false);
        return bluebird.delay(1500); // TODO: hack
    }).then(() => {
        console.log('writing chunks');
        const imageBuf = Buffer.allocUnsafe(5818);
        return writeInChunks(tx, imageBuf);
    }).then(() => {
        console.log('sending end');
        tx.writeAsync(Buffer.from([100]), false);
        return bluebird.delay(1500); // TODO: hack
    }).then(() => {
        console.log('disconnecting');
        if (muki.state !== 'disconnected') {
            return muki.disconnectAsync();
        }
    }).then(() => {
        console.log('disconnected');
        process.exit(0);
    });
});
