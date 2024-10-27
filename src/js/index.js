// 从相应的库中导入所需的类和方法
import 'phaser';
import { enable3d, Scene3D, Canvas, ExtendedObject3D } from '@enable3d/phaser-extension';

class MainScene extends Scene3D {
  constructor() {
    super({ key: 'MainScene' })
  }

  init() {
    this.accessThirdDimension()
  }

  async create() {
    const { camera, orbitControls } = await this.third.warpSpeed()
    camera.position.set(3, 10, 6)
    camera.lookAt(0, 5, 0)
    orbitControls.target.set(0, 5, 0)
    
    const earth = new ExtendedObject3D()
    const pos = {x: 0, y: 5, z: 0}
    this.third.load.fbx('/src/assets/newpixelearth.fbx').then(object => {
      earth.add(object)
      this.third.add.existing(earth)
    })
  }
}

const config = {
  type: Phaser.WEBGL,
  transparent: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth * Math.max(1, window.devicePixelRatio / 2),
    height: window.innerHeight * Math.max(1, window.devicePixelRatio / 2)
  },
  scene: [MainScene],
  ...Canvas()
}

window.addEventListener('load', () => {
  enable3d(() => new Phaser.Game(config)).withPhysics('/src/lib/ammo')
})