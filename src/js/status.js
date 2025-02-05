class MainScene extends Scene3D {
    constructor() {
      super({ key: 'MainScene' })
      this.initializePopup()
    }
  
    async initializePopup() {
      try {
        // 加载HTML模板
        const response = await fetch('markerPopup.html')
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
        linkElem.href = 'markerPopup.css'
        document.head.appendChild(linkElem)
      } catch (error) {
        console.error('Error initializing popup:', error)
      }
    }
  
    showPopup(data, x, y) {
      const { name, coordinates, description } = data
      
      // 更新弹窗内容
      this.popupContainer.querySelector('.popup-title').textContent = name
      this.popupContainer.querySelector('.lat-value').textContent = coordinates.latitude.toFixed(4)
      this.popupContainer.querySelector('.lng-value').textContent = coordinates.longitude.toFixed(4)
      this.popupContainer.querySelector('.popup-description').textContent = 
        description || `这里是${name}，在2049年的地球上，这片区域已经发生了巨大的变化...`
  
      // 调整位置
      const rect = this.popupContainer.getBoundingClientRect()
      const maxX = window.innerWidth - rect.width - 20
      const maxY = window.innerHeight - rect.height - 20
      
      x = Math.min(Math.max(20, x), maxX)
      y = Math.min(Math.max(20, y), maxY)
      
      this.popupContainer.style.left = x + 'px'
      this.popupContainer.style.top = y + 'px'
      
      // 显示弹窗
      this.popupContainer.style.display = 'block'
      // 触发动画
      requestAnimationFrame(() => {
        this.popupContainer.classList.add('popup-show')
      })
    }
  
    hidePopup() {
      this.popupContainer.classList.remove('popup-show')
      setTimeout(() => {
        this.popupContainer.style.display = 'none'
      }, 300)
    }
  
    setupMarkerInteraction() {
      const raycaster = new THREE.Raycaster()
      const mouse = new THREE.Vector2()
  
      window.addEventListener('click', (event) => {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  
        raycaster.setFromCamera(mouse, this.third.camera)
  
        const markerObjects = []
        this.earth.traverse((object) => {
          if (object.type === 'Group' && object.userData.name) {
            markerObjects.push(object)
          }
        })
  
        const intersects = raycaster.intersectObjects(markerObjects, true)
  
        if (intersects.length > 0) {
          let markerObject = intersects[0].object
          while (markerObject && !markerObject.userData.name) {
            markerObject = markerObject.parent
          }
  
          if (markerObject && markerObject.userData) {
            this.showPopup(
              markerObject.userData,
              event.clientX + 10,
              event.clientY + 10
            )
          }
        } else {
          this.hidePopup()
        }
      })
    }
  
    // ... 其他现有代码 ...
  }