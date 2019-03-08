
let data: Array<IData> = [
  // value 值, time出现的时间, speed速度
  {value: 'zf', time: 0, speed: 2, color: 'red', fontSize: 20 },
  {value: 'sz', time: 0},
  {value: 'pink', time: 1}
]

let $ = document.querySelector.bind(document)

let canvas: HTMLCanvasElement = $('#canvas') as HTMLCanvasElement
let video: HTMLVideoElement = $('#video') as HTMLVideoElement
let text: HTMLInputElement = $('#text') as HTMLInputElement
let add: HTMLButtonElement = $('#add') as HTMLButtonElement
let color: HTMLInputElement = $('#color') as HTMLInputElement
let range: HTMLInputElement = $('#range') as HTMLInputElement

class CanvasGabbage {
  public canvas: HTMLCanvasElement
  protected video: HTMLVideoElement
  public options: {data: Array<IData>}
  public isPaused: boolean = true
  protected barrages: Array<Barrage>
  public context: CanvasRenderingContext2D | CanvasRect

  public data: Array<any> = []
  public fontSize?: number
  public color?: string
  public speed?: number
  public opacity?: string | null
  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement, options: {data: Array<IData>}) {
    this.canvas = canvas
    this.video = video
    this.options = options

    // 默认值
    let defaultOptions = {
      fontSize: 20,
      color: 'gold',
      speed: 2,
      opacity: 0.3,
      data: []
    }
    Object.assign(this, defaultOptions, options)

    // 画布
    this.context = canvas.getContext('2d') as CanvasRenderingContext2D | CanvasRect
    this.canvas.width = this.video.clientWidth
    this.canvas.height = this.video.clientHeight

    // 是否暂停
    this.isPaused = true // 默认暂停播放，表示不渲染弹幕
    // 存放所有弹幕, Barrage创造弹幕的实例类
    this.barrages = this.data.map(item => new Barrage(item, this))
    console.log(this.barrages, 'this.barrages')
    // 渲染所有弹幕
    this.render()
  }
  // 渲染弹幕
  public render (): void {
    // 第一次 先清空画布操作，执行渲染弹幕，如果没有暂停，一直清空再渲染。
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.renderBarrage() // 渲染弹幕
    if (this.isPaused === false) {
      // 递归渲染
      requestAnimationFrame(this.render.bind(this))
    }
  }
  // 渲染每一条弹幕
  protected renderBarrage (): void {
    // 将数组中的弹幕一个一个取出，判断时间和视频的时间是否符合，符合就执行渲染此弹幕。
    let time = this.video.currentTime
    this.barrages.forEach(barrage => {
      if (!barrage.flag && time >= barrage.time) {
        // 初始化，初始化后再绘制
        if (!barrage.isInited) {
          barrage.init()
          barrage.isInited = true
        }
        barrage.x -= barrage.speed
        barrage.render()
        if (barrage.x <= barrage.width * -1) {
          barrage.flag = true // 停止渲染
        }
      }
    })
  }
  // 添加弹幕
  public add (obj: IData): void {
    this.barrages.push(new Barrage(obj, this))
  }
  // 重置
  public reset () {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    let time = this.video.currentTime
    this.barrages.forEach(barrage => {
      barrage.flag = false
      if (time <= barrage.time) {
        barrage.isInited = false // 重新初始化
      } else {
        barrage.flag = true // 其他弹幕不再渲染
      }
    })
  }
}

class Barrage {
  public value: string
  public time: number
  public bar: IData
  public cxt: CanvasGabbage
  public isInited: boolean = false
  public opacity: string | null = ''
  public color: string = ''
  public fontSize: number = 0
  public width: number = 0
  public speed: number = 0
  public x: number = 0
  public y: number = 0
  public flag: boolean = false
  constructor (bar: IData, cxt: CanvasGabbage) {
    this.value = bar.value // 弹幕内容
    this.time = bar.time // 弹幕时间
    this.bar = bar // 当前条弹幕
    this.cxt = cxt
  }
  public render (): void {
    ;(this.cxt.context as any).fillStyle = this.color
    ;(this.cxt.context as any).font = this.fontSize + 'px "Microsoft YaHei"'
    ;(this.cxt.context as any).fillText(this.value, this.x, this.y)
  }
  public init (): void {
    this.opacity = (this.bar.opacity as string | null) || (this.cxt.opacity as string | null)
    this.color = (this.bar.color as string) || (this.cxt.color as string)
    this.fontSize = (this.bar.fontSize as number) || (this.cxt.fontSize as number)
    this.speed = (this.bar.speed as number) || (this.cxt.speed as number)

    let span = document.createElement('span')
    span.innerText = this.value
    span.style.font = this.fontSize + 'px "Microsoft YaHei"'
    span.style.opacity = this.opacity
    span.style.position = 'absolute'
    document.body.appendChild(span)
    // 记录弹幕的宽度
    this.width = span.clientWidth
    document.body.removeChild(span)
    
    // 弹幕的出现位置
    this.x = this.cxt.canvas.width
    this.y = this.cxt.canvas.height * Math.random()

    // 字体基线判断，不能溢出
    if (this.y < this.fontSize) {
      this.y = this.fontSize
    }
    if (this.y > this.cxt.canvas.height - this.fontSize) {
      this.y = this.cxt.canvas.height - this.fontSize
    }
  }
}

let canvasGabbage = new CanvasGabbage(canvas, video, {data})

// 存储数据到redis
let socket = new WebSocket('ws://127.0.0.1:1230')
socket.onopen = function () {
  socket.onmessage = function (e) {
    let message = JSON.parse(e.data)
    console.log(message, 'message')
    if (message.type === 'INIT') {
      canvasGabbage = new CanvasGabbage(canvas, video, {
        data: message.data
      })
    } else if (message.type === 'ADD') {
      canvasGabbage.add(message.data)
    }
    
  }
}

// 播放
video.addEventListener('play', () => {
  canvasGabbage.isPaused = false
  canvasGabbage.render()
})

// 暂停
video.addEventListener('pause', () => {
  canvasGabbage.isPaused = true
})

// 结束
video.addEventListener('ended', () => {
  canvasGabbage.isPaused = true
  canvasGabbage.reset()
})

// 拖动
video.addEventListener('seeked', () => {
  canvasGabbage.reset()
})

// 添加弹幕
add.addEventListener('click', () => {
  let value = text.value
  let time = video.currentTime
  let _color = color.value
  let fontSize: number = parseInt(range.value)
  let obj = {
    value,
    time,
    fontSize,
    color: _color
  }
  socket.send(JSON.stringify(obj))
  // canvasGabbage.add(obj)
})
