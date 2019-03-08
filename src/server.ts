
import Websocket from "ws"
import redis from 'redis'

const ADD = 'ADD'
const INIT = 'INIT'

let wss = new Websocket.Server({port: 1230})
let client = redis.createClient()

let clientArr: Array<any> = []

wss.on('connection', (ws) => {
    clientArr.push(ws)
    client.lrange('barrage', 0, -1, (err, applies) => {
        applies = applies.map(item => JSON.parse(item))
        ws.send(JSON.stringify({type: INIT, data: applies}))
    })
    ws.on('message', (data: string) => {
        client.rpush('barrage', data, redis.print)
        console.log(data, 'data')
        clientArr.forEach(w => w.send(JSON.stringify({type: ADD, data: JSON.parse(data)})))
        // ws.send(JSON.stringify({type: ADD, data: JSON.parse(data)}))
    })
    ws.on('close', () => {
        clientArr = clientArr.filter(client => client !== ws)
    })
})
