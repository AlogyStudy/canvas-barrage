"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ws_1 = __importDefault(require("ws"));
const redis_1 = __importDefault(require("redis"));
const ADD = 'ADD';
const INIT = 'INIT';
let wss = new ws_1.default.Server({ port: 1230 });
let client = redis_1.default.createClient();
let clientArr = [];
wss.on('connection', (ws) => {
    clientArr.push(ws);
    client.lrange('barrage', 0, -1, (err, applies) => {
        applies = applies.map(item => JSON.parse(item));
        ws.send(JSON.stringify({ type: INIT, data: applies }));
    });
    ws.on('message', (data) => {
        client.rpush('barrage', data, redis_1.default.print);
        console.log(data, 'data');
        clientArr.forEach(w => w.send(JSON.stringify({ type: ADD, data: JSON.parse(data) })));
        // ws.send(JSON.stringify({type: ADD, data: JSON.parse(data)}))
    });
    ws.on('close', () => {
        clientArr = clientArr.filter(client => client !== ws);
    });
});
