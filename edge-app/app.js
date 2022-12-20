//Libraries
let mqtt = require('mqtt')
let express = require('express')
let app = express()
let http = require('http');
let server = http.createServer(app);
let io = require('socket.io')(server, {
    cors: {
        origin: '*',
    }
});

//MQTT
// MQTT Definitions
//let MQTT_ADDRESS = 'mqtt://172.26.0.1:1883'
let MQTT_ADDRESS = 'mqtt://ie-databus:1883' // On Edge Device
let MQTT_SUB_TOPIC = 'ie/d/j/simatic/v1/s7c1/dp/r/plc/default'
let MQTT_PUB_TOPIC = 'ie/d/j/simatic/v1/s7c1/dp/w/plc'
const options = {
    'clientId': 'mqttjs_' + Math.random().toString(16).substr(2, 8),
    'protocolId': 'MQTT',
    'username': "edge",
    'password': "edge"
}

let client = mqtt.connect(MQTT_ADDRESS, options)

//MQTT Connection
client.on('connect', () => {
    client.subscribe(MQTT_SUB_TOPIC, (err) => {
        if (!err) {
            console.log('Client Connected!')
        }
    })
})

//MQTT Read Messages
client.on('message', (topic, message) => {
    console.log(topic)
    console.log(message.toString())

    let plcData = JSON.parse(message.toString()).vals;

    let bottleProduced = plcData.filter(function (el) {
        return el.id == 146
    })

    let bottleFaulty = plcData.filter(function (el) {
        return el.id == 147
    })

    let clientData = {
        "bottleProduced": {
            "id": bottleProduced[0]?.id,
            "count": bottleProduced[0]?.val,
            "date": bottleProduced[0]?.ts,
        },

        "bottleFaulty": {
            "id": bottleFaulty[0]?.id,
            "count": bottleFaulty[0]?.val,
            "date": bottleFaulty[0]?.ts,
        },
    }

    if (clientData.bottleProduced.count || clientData.bottleFaulty.count) {
        console.log(clientData)
        sendDataToClient(clientData)
        saveDataOnDB(clientData)
    }
})

//MQTT Write Message
function resetData() {
    let resetMessage = {
        "seq": 1,
        "vals": [
            {
                "id": "146",
                "qc": 3,
                "ts": new Date(),
                "val": 0
            },
            {
                "id": "147",
                "qc": 3,
                "ts": new Date(),
                "val": 0
            },
        ]
    }

    client.publish(MQTT_PUB_TOPIC, JSON.stringify(resetMessage))
}

//WebSocket

io.on('connection', (socket) => {
    console.log('A user is connected!')

    socket.on('disconnect', () => {
        console.log('A user is disconnected!')
    })

    socket.on('reset', (data) => {
        console.log('resetData() functions to be run!')
        resetData();
    })
})

function sendDataToClient(clientData) {
    io.emit('clientdata', clientData)
}

//Server  Settings

app.get('/', (req, res) => {
    res.send('Hello World!');
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});

//Database

let mongoose = require('mongoose');
let dbConnctionString = 'mongodb://edge:edge@edge-db:27017/edge?authSource=admin'
mongoose.connect(dbConnctionString, { useNewUrlParser: true, useUnifiedTopology: true })
let connection = mongoose.connection;
connection.on('connected', () => {
    console.log('Successfuly connected to DB');
})
connection.on('error', err => {
    logger.error('Unable to connect DB! ' + err)
})

const Schema = mongoose.Schema;
const productionQuality = new Schema({
    id: Number,
    date: Date,
    count: Number
});

const ProductionQuality = mongoose.model('production-quality', productionQuality);
function saveDataOnDB(clientData) {
    if (clientData.bottleProduced.id) {
        let record = {
            id: clientData.bottleProduced.id,
            date: clientData.bottleProduced.date,
            count: clientData.bottleProduced.count
        }
        createRecord(record)
    }

    if (clientData.bottleFaulty.id) {
        let record = {
            id: clientData.bottleFaulty.id,
            date: clientData.bottleFaulty.date,
            count: clientData.bottleFaulty.count
        }
        createRecord(record)
    }


    function createRecord(record) {
        ProductionQuality.create(record, (err, result) => {
            if (err) logger.error(err);
            if (!result) {
                console.log(`New Record is Failed`)
            } else {
                console.log(`New Record is Created`)
            }
        });
    }
}