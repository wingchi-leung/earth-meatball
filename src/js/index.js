// 从相应的库中导入所需的类和方法
const { enable3d, Scene3D, Canvas, ExtendedObject3D ,THREE } = ENABLE3D;

class MainScene extends Scene3D {
  constructor() {
    super({ key: 'MainScene' })
  }

  init() {
    this.accessThirdDimension()
  }

 
  async create() {
    const { camera, orbitControls } = await this.third.warpSpeed()
    camera.position.set(3, 10, 300)
    camera.lookAt(0, 5, 0)
    orbitControls.target.set(0, 5, 0)

    // 创建地球
    const earth = new ExtendedObject3D()
    
    try {
      // 等待地球模型加载完成
      const object = await this.third.load.fbx('src/assets/newpixelearth.fbx')
      earth.add(object)
      this.third.add.existing(earth)
      this.earth = earth
      
      // 确保地球模型加载完成后再加载和添加标记
      await this.addLocationMarker()
    } catch (error) {
      console.error('Error loading earth model:', error)
    }
  }

  update() {
    // 更新 controls
    if (this.controls) {
      this.controls.update()
    }

    // 直接旋转模型
    if (this.earth) {
      this.earth.rotation.y += 0.0001  // 调整旋转速度
    }
  }

  
//  async addLocationMarker() {
//     if (!this.earth) {
//       console.error('Earth model not loaded yet')
//       return
//     }

//     try {
//       // 加载标记纹理
//       const markerTexture = await this.third.load.texture('src/assets/pixel_pin.png')
      
//       const markerMaterial = new THREE.SpriteMaterial({ 
//         map: markerTexture,
//         sizeAttenuation: false,
//         depthTest: false,  // 禁用深度测试，确保标记始终可见
//         depthWrite: false  // 禁用深度写入
//       })
      
//       const marker = new THREE.Sprite(markerMaterial)
//       marker.scale.set(1, 1, 1)
      
//       const latitude = 35.6762
//       const longitude = 139.6503
//       const radius = 5.1  // 略微增加半径，使标记位于地球表面之上
      
//       const phi = (90 - latitude) * (Math.PI / 180)
//       const theta = (longitude + 180) * (Math.PI / 180)
      
//       marker.position.x = -(radius * Math.sin(phi) * Math.cos(theta))
//       marker.position.z = (radius * Math.sin(phi) * Math.sin(theta))
//       marker.position.y = (radius * Math.cos(phi))
      
//       // 设置渲染顺序
//       marker.renderOrder = 999  // 确保标记在最上层渲染
      
//       if (this.earth) {
//         this.earth.add(marker)
//         this.marker = marker
//       } else {
//         console.error('Earth reference lost during marker creation')
//       }
//     } catch (error) {
//       console.error('Error creating marker:', error)
//     }
// }
}



const config = {
  type: Phaser.WEBGL,
  transparent: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth * Math.max(1, window.devicePixelRatio  ),
    height: window.innerHeight * Math.max(1, window.devicePixelRatio  )
  },
  scene: [MainScene],
  ...Canvas()
}

window.addEventListener('load', () => {
  enable3d(() => new Phaser.Game(config)).withPhysics('/src/lib/ammo')
})