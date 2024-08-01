import './style.css'
import { setupCanvas } from './canvas.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <canvas id="canvas" />
  </div>
`

setupCanvas(document.getElementById("canvas")!)
