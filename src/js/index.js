// 从相应的库中导入所需的类和方法
const { enable3d, Scene3D, Canvas, ExtendedObject3D, THREE } = ENABLE3D;


// 添加自定义CSS样式
const style = document.createElement('style')
style.textContent = `
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
  
    .cursor {
      display: inline-block;
      width: 8px;
      height: 14px;
      background: #00ffff;
      margin-left: 2px;
      animation: blink 1s infinite;
    }
  `
document.head.appendChild(style)


class CoordinatesHelper {
  constructor(earthRadius = 99.75768744023222) {  // 地球半径，需要根据你的模型调整
    this.radius = earthRadius;
  }

  // 将经纬度转换为3D坐标
  latLngToXYZ(latitude, longitude) {
    // 将经纬度转换为弧度
    const lat = (90 - latitude) * (Math.PI / 180);  // phi
    const lng = (longitude + 180) * (Math.PI / 180); // theta

    // 球面坐标转换为笛卡尔坐标
    const x = -(this.radius * Math.sin(lat) * Math.cos(lng));
    const y = (this.radius * Math.cos(lat));
    const z = (this.radius * Math.sin(lat) * Math.sin(lng));

    return { x, y, z };
  }

  // 将3D坐标转换回经纬度
  xyzToLatLng(x, y, z) {
    const lat = 90 - (Math.acos(y / this.radius) * 180 / Math.PI);
    const lng = ((Math.atan2(z, -x) * 180 / Math.PI) - 180) % 360;

    return { latitude: lat, longitude: lng };
  }

  // 计算两点之间的距离（以度为单位）
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = this.radius;
    const p1 = lat1 * Math.PI / 180;
    const p2 = lat2 * Math.PI / 180;
    const dp = (lat2 - lat1) * Math.PI / 180;
    const dl = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
      Math.cos(p1) * Math.cos(p2) *
      Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }
}



class MainScene extends Scene3D {
  constructor() {
    super({ key: 'MainScene' })
    this.coordHelper = new CoordinatesHelper(99.75768744023222); // 设置与你的地球模型相同的半径
    this.createCornerText()
    this.initializePopup()
    this.locationData = {
      "东京": {
        image: "/src/assets/tokyo.jpg",
        description: "2049年的东京，海平面上升，当地曼妙的生物就是鱼类了"
      },
      "纽约": {
        image: "/src/assets/tokyo.jpg",
        description: ""
      },
      "北京": {
        image: "/src/assets/tokyo.jpg",
        description: ""
      },
      "伦敦": {
        image: "/src/assets/tokyo.jpg",
        description: ""
      },
      "悉尼": {
        image: "/src/assets/tokyo.jpg",
        description: ""
      }
    }
  }
 
  async initializePopup() {
    try {
      // 加载HTML模板
      const response = await fetch('../mark.html')
      const text = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(text, 'text/html')
      const template = doc.querySelector('#marker-popup-template')
      
      // 创建弹窗元素
      this.popupContainer = template.content.cloneNode(true).querySelector('.popup-container')
      document.body.appendChild(this.popupContainer)
      
      // 添加关闭事件监听
      this.popupContainer.querySelector('.popup-close').onclick = () => this.hidePopup()
      
      // 加载CSS
      const linkElem = document.createElement('link')
      linkElem.rel = 'stylesheet'
      linkElem.href = '../mark.css'
      document.head.appendChild(linkElem)
    } catch (error) {
      console.error('Error initializing popup:', error)
    }
  }
  
  showPopup(data, x, y) {
    console.log('Showing popup with data:', data); // 调试日志

    const { name, coordinates, image, description } = data;
    
    // 更新弹窗内容
    const popupContent = `
      <h3 class="popup-title">${name}</h3>
      ${image ? `
        <div class="popup-image">
          <img src="${image}" 
               alt="${name}" 
               onerror="console.error('Image failed to load:', this.src); this.style.display='none'"
               onload="console.log('Image loaded successfully:', this.src)"
          />
        </div>
      ` : ''}
      <div class="popup-coordinates">
        <div class="coordinate-item latitude">
          纬度: ${coordinates.latitude.toFixed(4)}°
        </div>
        <div class="coordinate-item longitude">
          经度: ${coordinates.longitude.toFixed(4)}°
        </div>
      </div>
      <div class="popup-description">
        ${description || `这里是${name}...`}
      </div>
    `;

    // 更新弹窗内容
    this.popupContainer.querySelector('.popup-content').innerHTML = popupContent;

    // 调整位置
    const rect = this.popupContainer.getBoundingClientRect();
    const maxX = window.innerWidth - rect.width - 20;
    const maxY = window.innerHeight - rect.height - 20;
    
    x = Math.min(Math.max(20, x), maxX);
    y = Math.min(Math.max(20, y), maxY);
    
    this.popupContainer.style.left = x + 'px';
    this.popupContainer.style.top = y + 'px';
    
    // 显示弹窗
    this.popupContainer.style.display = 'block';
    
    // 添加动画类
    requestAnimationFrame(() => {
      this.popupContainer.classList.add('popup-show');
    });
  }


   // 添加图片预加载功能
   preloadImages() {
    Object.values(this.locationData).forEach(data => {
      if (data.image) {
        const img = new Image();
        img.src = data.image;
      }
    });
  }




  hidePopup() {
    this.popupContainer.classList.remove('popup-show')
    setTimeout(() => {
      this.popupContainer.style.display = 'none'
    }, 300)
  }

  
  setupMarkerInteraction() {
    console.log('Setting up marker interaction...'); // 调试日志

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // 调整射线投射器的精度
    raycaster.params.Points.threshold = 3;

    window.addEventListener('click', (event) => {
      console.log('Click detected'); // 调试日志

      // 计算鼠标位置
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // 更新射线
      raycaster.setFromCamera(mouse, this.third.camera);

      // 收集所有标记物体
      const markerObjects = [];
      this.earth.traverse((object) => {
        // 检查是否是标记组
        if (object.type === 'Group' && object.userData.name) {
          // console.log('Found marker:', object.userData.name); // 调试日志
          markerObjects.push(object);
        }
      });

      // console.log('Total markers found:', markerObjects.length); // 调试日志

      // 检查射线与标记的相交
      const intersects = raycaster.intersectObjects(markerObjects, true);
      // console.log('Intersections found:', intersects.length); // 调试日志

      if (intersects.length > 0) {
        console.log('Intersection detected'); // 调试日志
        
        // 找到包含userData的父对象
        let markerObject = intersects[0].object;
        while (markerObject && !markerObject.userData.name) {
          markerObject = markerObject.parent;
        }

        if (markerObject && markerObject.userData) {
          console.log('Showing popup for:', markerObject.userData.name); // 调试日志
          
          const data = markerObject.userData;
          this.showPopup(data, event.clientX + 10, event.clientY + 10);
        }
      } else {
        // 检查点击是否在弹窗外
        const popup = this.popupContainer;
        if (popup) {
          const rect = popup.getBoundingClientRect();
          const clickedInsidePopup = (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          );

          if (!clickedInsidePopup) {
            this.hidePopup();
          }
        }
      }
    });

    // 添加鼠标悬停效果
    let hoveredMarker = null;
    window.addEventListener('mousemove', (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.third.camera);

      const markerObjects = [];
      this.earth.traverse((object) => {
        if (object.type === 'Group' && object.userData.name) {
          markerObjects.push(object);
        }
      });

      const intersects = raycaster.intersectObjects(markerObjects, true);

      if (intersects.length > 0) {
        let markerObject = intersects[0].object;
        while (markerObject && !markerObject.userData.name) {
          markerObject = markerObject.parent;
        }

        if (markerObject !== hoveredMarker) {
          // 重置之前悬停的标记
          if (hoveredMarker) {
            this.resetMarkerScale(hoveredMarker);
          }
          
          // 放大当前悬停的标记
          this.highlightMarker(markerObject);
          hoveredMarker = markerObject;
          
          // 改变鼠标样式
          document.body.style.cursor = 'pointer';
        }
      } else {
        // 重置之前悬停的标记
        if (hoveredMarker) {
          this.resetMarkerScale(hoveredMarker);
          hoveredMarker = null;
        }
        document.body.style.cursor = 'default';
      }
    });
  }

    // 高亮标记
    highlightMarker(marker) {
      if (marker && marker.scale) {
        marker.scale.set(1.2, 1.2, 1.2);
        // 如果标记有材质，可以改变其颜色或透明度
        marker.traverse((child) => {
          if (child.material) {
            child.material.opacity = 1;
            child.material.color.setHex(0x00ffff);
          }
        });
      }
    }
  
    // 重置标记状态
  resetMarkerScale(marker) {
    if (marker && marker.scale) {
      marker.scale.set(1, 1, 1);
      // 重置材质
      marker.traverse((child) => {
        if (child.material) {
          child.material.opacity = 0.8;
          child.material.color.setHex(0xffdb7a);
        }
      });
    }
  }

  
  init() {
    // 确保在这里调用
    this.accessThirdDimension()

    // 设置透明背景
    this.cameras.main.transparent = true
  }

  async create() {
    console.log('Scene creating...')
    this.preloadImages();
    const { camera, orbitControls } = await this.third.warpSpeed('-ground')

    // 调整相机位置，拉远一点以便看到整个地球
    camera.position.set(0, 0, 400)
    camera.lookAt(0, 0, 0)
    orbitControls.target.set(0, 0, 0)


    // 设置渐变背景
    const topColor = new THREE.Color(0x000022)
    const bottomColor = new THREE.Color(0x000066)

    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 2

    const context = canvas.getContext('2d')
    const gradient = context.createLinearGradient(0, 0, 0, 2)
    gradient.addColorStop(0, topColor.getStyle())
    gradient.addColorStop(1, bottomColor.getStyle())

    context.fillStyle = gradient
    context.fillRect(0, 0, 2, 2)

    const texture = new THREE.CanvasTexture(canvas)
    this.third.scene.background = texture

    this.createStarfield()


    // // 添加强一点的环境光
    // const ambientLight = new THREE.AmbientLight(0xffffff, 2)
    // this.third.add.existing(ambientLight)

    // 创建地球

    const earth = new ExtendedObject3D()

    try {

      const object = await this.third.load.fbx('src/assets/newpixelearth.fbx')


      earth.add(object)
      this.third.add.existing(earth)
      this.earth = earth


      // 方法1：获取包围盒尺寸
      const boundingBox = new THREE.Box3().setFromObject(earth)
      const size = boundingBox.getSize(new THREE.Vector3())
      console.log('Earth bounding box size:', {
        width: size.x,
        height: size.y,
        depth: size.z
      })

      // 方法2：获取球体半径（假设是完美球体，取最大值的一半）
      const radius = Math.max(size.x, size.y, size.z) / 2
      console.log('Estimated sphere radius:', radius)

      // // 添加一个球体辅助工具
      // const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32)
      // const sphereMaterial = new THREE.MeshBasicMaterial({
      //   color: 0x00ff00,
      //   wireframe: true,
      //   transparent: true,
      //   opacity: 0.1
      // })
      // const sphereHelper = new THREE.Mesh(sphereGeometry, sphereMaterial)
      // this.third.add.existing(sphereHelper)
      // this.earthRadius = radius
      // 添加多个测试标记



      // 示例坐标点
      const locations = [
        { name: "北京", lat: 39.9042, lng: 116.4074 },
        { name: "东京", lat: 35.6762, lng: 139.6503 },
        { name: "纽约", lat: 40.7128, lng: -74.0060 },
        { name: "伦敦", lat: 51.5074, lng: -0.1278 },
        { name: "悉尼", lat: -33.8688, lng: 151.2093 }
      ];
      // 添加标记
      locations.forEach(loc => {
        const coords = this.coordHelper.latLngToXYZ(loc.lat, loc.lng);
        this.addMarker(coords.x, coords.y, coords.z, loc.name);
      });
      this.coordHelper = new CoordinatesHelper(150); // 设置与你的地球模型相同的半径
      // 2. 再设置交互
      this.setupMarkerInteraction()

    } catch (error) {
      console.error('Error loading earth model:', error)
    }
  }

  addMarker(x, y, z, name) {
    const markerGroup = new THREE.Group();
    const hitGeometry = new THREE.SphereGeometry(5, 16, 16);
    const hitMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const hitSphere = new THREE.Mesh(hitGeometry, hitMaterial);
    markerGroup.add(hitSphere);


    // 颜色方案
    const colors = {
      // 科技蓝色系
      main: 0x00ffff,      // 青色主色
      glow: 0x4dffff,      // 发光色
      core: 0xffffff,      // 核心白色
      pulse: 0x00cccc      // 脉冲色
    };

    // 1. 创建发光的底座圆环
    const ringGeometry = new THREE.RingGeometry(1.5, 2, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colors.glow,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeometry, glowMaterial);

    // 2. 创建中心发光点
    const dotGeometry = new THREE.CircleGeometry(1, 32);
    const dotMaterial = new THREE.MeshBasicMaterial({
      color: colors.core,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });
    const dot = new THREE.Mesh(dotGeometry, dotMaterial);
    dot.position.z = 0.1;

    // 3. 创建垂直光柱
    const pillarGeometry = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
    const pillarMaterial = new THREE.MeshBasicMaterial({
      color: colors.main,
      transparent: true,
      opacity: 0.3
    });
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.z = 4;

    // 4. 创建外部光晕
    const glowRingGeometry = new THREE.RingGeometry(2, 3, 32);
    const glowRingMaterial = new THREE.MeshBasicMaterial({
      color: colors.glow,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const glowRing = new THREE.Mesh(glowRingGeometry, glowMaterial);
    glowRing.position.z = 0.05;

    // 5. 添加脉冲动画效果
    const pulseGeometry = new THREE.RingGeometry(0.5, 1, 32);
    const pulseMaterial = new THREE.MeshBasicMaterial({
      color: colors.pulse,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide
    });
    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    pulse.userData.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseMarkers = this.pulseMarkers || [];
    this.pulseMarkers.push(pulse);

    // 将所有部分添加到组中
    markerGroup.add(ring);
    markerGroup.add(dot);
    markerGroup.add(pillar);
    markerGroup.add(glowRing);
    markerGroup.add(pulse);

    markerGroup.position.set(x, y, z);
    markerGroup.lookAt(0, 0, 0);

    markerGroup.userData.name = name;
    markerGroup.userData.coordinates = this.coordHelper.xyzToLatLng(x, y, z);

    this.earth.add(markerGroup);

   // 确保设置userData
   markerGroup.userData = {
    name: name,
    coordinates: this.coordHelper.xyzToLatLng(x, y, z),
    description: `这里是${name}，在2049年的地球上...`
  };

  markerGroup.position.set(x, y, z);
  markerGroup.lookAt(0, 0, 0);
  
  this.earth.add(markerGroup);

   // 确保 userData 包含完整的位置数据
   const locationInfo = this.locationData[name] || {};
   markerGroup.userData = {
     name,
     coordinates: this.coordHelper.xyzToLatLng(x, y, z),
     image: locationInfo.image,
     description: locationInfo.description
   };  
     console.log('Created marker with data:', markerGroup.userData); // 调试日志
  return markerGroup;
  }


  createStarfield() {
    const particleCount = 2000
    const particles = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 1000
      positions[i + 1] = (Math.random() - 0.5) * 1000
      positions[i + 2] = (Math.random() - 0.5) * 1000
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const particleMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 1,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    })

    this.starfield = new THREE.Points(particles, particleMaterial)
    this.third.scene.add(this.starfield)
  }


  addTestMarkers() {
    console.log('Adding test markers...')

    // 创建一个发光材质
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdb7a,  // 暗黄色
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    })

    // 添加多个标记点
    const locations = [
      { lat: 35.6762, lng: 139.6503 },  // 东京
      { lat: 40.7128, lng: -74.0060 },  // 纽约
      { lat: -33.8688, lng: 151.2093 }  // 悉尼
    ]

    locations.forEach(loc => {
      // 转换经纬度到3D坐标
      const radius = 150  // 增大半径以匹配地球大小
      const phi = (90 - loc.lat) * (Math.PI / 180)
      const theta = (loc.lng + 180) * (Math.PI / 180)

      const x = -(radius * Math.sin(phi) * Math.cos(theta))
      const z = (radius * Math.sin(phi) * Math.sin(theta))
      const y = (radius * Math.cos(phi))

      // 创建标记点（使用圆柱体代替球体）
      const markerGeometry = new THREE.CylinderGeometry(2, 2, 10, 8)  // 增大尺寸
      const marker = new THREE.Mesh(markerGeometry, glowMaterial)

      // 设置位置
      marker.position.set(x, y, z)

      // 使圆柱体指向球心
      marker.lookAt(0, 0, 0)

      // 添加到地球
      this.earth.add(marker)

      // 添加光环效果
      const ringGeometry = new THREE.RingGeometry(3, 5, 32)
      const ring = new THREE.Mesh(ringGeometry, glowMaterial)
      ring.position.copy(marker.position)
      ring.lookAt(0, 0, 0)
      this.earth.add(ring)
    })

    console.log('Test markers added')
  }

  update() {
    if (this.starfield) {
      this.starfield.rotation.y += 0.0001
    }

    // 更新地球旋转
    if (this.earth) {
      this.earth.rotation.y += 0.001;
    }

    // 更新脉冲动画
    const time = Date.now() * 0.001; // 当前时间（秒）
    if (this.pulseMarkers) {
      this.pulseMarkers.forEach(pulse => {
        // 使用正弦波创建脉冲效果
        const phase = pulse.userData.pulsePhase;
        const scale = 1 + 0.3 * Math.sin(time * 2 + phase);
        pulse.scale.set(scale, scale, 1);

        // 调整透明度
        pulse.material.opacity = 0.4 * (1 - Math.abs(Math.sin(time * 2 + phase)));
      });
    }
  }




  createCornerText() {
    
    // 创建文字容器
    const textContainer = document.createElement('div')
    textContainer.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      color: #00ffff;
      font-family: 'Minecraft', monospace;
      font-size: 14px;
      text-align: right;
      z-index: 1000;
      pointer-events: none;
      opacity: 0;
      transition: opacity 1s ease;
    `

    // 创建打字机效果的函数
    const typeWriter = (element, text, delay = 100) => {
      let index = 0
      element.innerHTML = ''

      const type = () => {
        if (index < text.length) {
          element.innerHTML += text.charAt(index)
          index++
          setTimeout(type, delay)
        }
      }

      type()
    }

    // 添加多行文本
    const lines = [
      'loadding',
      '> Initializing memory fragments...'
    ]

    // 为每一行创建一个div
    lines.forEach(line => {
      const lineDiv = document.createElement('div')
      lineDiv.style.marginTop = '5px'
      textContainer.appendChild(lineDiv)
    })

    document.body.appendChild(textContainer)

    // 开始打字效果
    setTimeout(() => {
      textContainer.style.opacity = '1'

      lines.forEach((line, index) => {
        setTimeout(() => {
          typeWriter(textContainer.children[index], line, 50)
        }, index * 1000) // 每行之间延迟1秒
      })
    }, 1000) // 等待1秒后开始显示
  }
}

const config = {
  type: Phaser.WEBGL,
  transparent: true,
  alpha: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth * Math.max(1, window.devicePixelRatio),
    height: window.innerHeight * Math.max(1, window.devicePixelRatio)
  },
  scene: [MainScene],
  ...Canvas()
}

window.addEventListener('load', () => {
  console.log('Window loaded, initializing game...')
  enable3d(() => new Phaser.Game(config)).withPhysics('/src/lib/ammo')
})