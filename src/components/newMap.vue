<template>
  <div>
    <div>
      new map
      <label for="">
        applyGradient
        <input type="checkbox" v-model="applyGradient">
      </label>
      <button
        @click="seed = null, perlin()"
      >
        new perlin
      </button>
      <label for="">
        seed
        <input type="text" v-model="seed">
      </label>
      <button
        @click="perlin()"
      >
        perlin
      </button>
      <button
        @click="testDist()"
      >
        testDist
      </button>
    </div>
    <div>
      <canvas
        id="voronoiCanvas"
        :width="size.width"
        :height="size.height"
        @click="click($event)"
      ></canvas>
    </div>
    <div>
      cell info:
      {{ cellInfo }}
    </div>
  </div>
</template>

<script>
/* eslint-disable */
import Voronoi from '@/scripts/rhill-voronoi-core.js';
import QuadTree from '@/scripts/QuadTree.js';
import { voronoi } from '@/assets/mock.js'
import { distance, Hex, hex_lerp } from '@/scripts/hex.js';
import { highlightCell, getRandomFrom, generateGrid, generateHexGrid } from '@/scripts/helpers.js';
import quest_marker from '@/assets/icons/quest_marker.png'
import human_city from '@/assets/icons/human_city.png'
import dwarf_city from '@/assets/icons/dwarf_city.png'
import elven_city from '@/assets/icons/elven_city.png'

export default {
  data () {
    return {
      applyGradient: false,
      gradientArray: [],
      hexGrid: [],
      highlightCell: highlightCell,
      seed: null,
      images: {
        quest_marker: quest_marker,
        human_city: human_city,
        dwarf_city: dwarf_city,
        elven_city: elven_city
      },
      cellInfo: {},
      colors: {
        water: '#163c68',
        shore: '#8da9c1',
        sand: '#b0aa8c',
        grass: '#8eae71',
        forrest: '#5a915b',
        deepforrest: '#417534',
        deepwater: '#0a1d33',
        mountain: '#7a5645'
      },
      map: {
        voronoi: new Voronoi(),
        sites: [],
        diagram: null,
        margin: 0.1,
        canvas: null,
        bbox: {
          xl: 0, xr: 800, yt: 0, yb: 600,
        },
        lastCell: undefined,
        treemap: null,
        init(regenerate) {
          return new Promise(resolve => {
            this.canvas = document.getElementById('voronoiCanvas');
            if (regenerate) {
              this.randomSites(10, true)
            }

            this.diagram = this.voronoi.compute(this.sites, this.bbox);

            this.render()
            resolve('done')
          })
        },
        randomSites(n, clear) {
          if (clear) { this.sites = []; }
          // create vertices
          const xmargin = this.canvas.width * this.margin;
          const ymargin = this.canvas.height * this.margin;
          const xo = xmargin;
          const dx = this.canvas.width - xmargin * 2;
          const yo = ymargin;
          const dy = this.canvas.height - ymargin * 2;
          for (let i = 0; i < n; i++) {
            this.sites.push({ x: self.Math.round((xo + self.Math.random() * dx) * 10) / 10, y: self.Math.round((yo + self.Math.random() * dy) * 10) / 10 });
          }
          this.treemap = null;
          this.diagram = this.voronoi.compute(this.sites, this.bbox);
          // this.updateStats();
        },
        render() {
          const ctx = this.canvas.getContext('2d');
          // background
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.rect(0, 0, this.canvas.width, this.canvas.height);
          ctx.fillStyle = 'rgba(0, 0, 0, 0)';
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.stroke();
          // voronoi
          if (!this.diagram) { return; }
          // edges
          ctx.beginPath();
          ctx.strokeStyle = '#000';
          const { edges } = this.diagram;
          let iEdge = edges.length;
          let edge;
          let v;
          while (iEdge--) {
            edge = edges[iEdge];
            v = edge.va;
            ctx.moveTo(v.x, v.y)
            v = edge.vb;
            ctx.lineTo(v.x, v.y)
          }
          ctx.stroke();
          // sites
          ctx.beginPath();
          ctx.fillStyle = '#44f';
          const { sites } = this;
          let iSite = sites.length;
          while (iSite--) {
            v = sites[iSite];
            ctx.rect(v.x - 2 / 3, v.y - 2 / 3, 2, 2);
          }
          ctx.fill();
        },
        buildTreemap() {
          const treemap = new QuadTree({
            x: this.bbox.xl,
            y: this.bbox.yt,
            width: this.bbox.xr - this.bbox.xl,
            height: this.bbox.yb - this.bbox.yt,
          });
          const { cells } = this.diagram;
          let iCell = cells.length;
          while (iCell--) {
            this.bbox = cells[iCell].getBbox();
            this.bbox.cellid = iCell;
            treemap.insert(this.bbox);
          }
          return treemap;
        },
        renderCell(id, fillStyle, strokeStyle) {
          if (id === undefined) { return; }
          if (!this.diagram) { return; }
          const cell = this.diagram.cells[id];
          if (!cell) { return; }
          const ctx = this.canvas.getContext('2d');
          ctx.globalAlpha = 1;
          // edges
          ctx.beginPath();
          const { halfedges } = cell;
          const nHalfedges = halfedges.length;
          let v = halfedges[0].getStartpoint();
          ctx.moveTo(v.x, v.y);
          for (let iHalfedge = 0; iHalfedge < nHalfedges; iHalfedge++) {
            v = halfedges[iHalfedge].getEndpoint();
            ctx.lineTo(v.x, v.y);
          }
          ctx.fillStyle = fillStyle;
          ctx.strokeStyle = strokeStyle;
          ctx.fill();
          ctx.stroke();
          // site
          v = cell.site;
          ctx.fillStyle = 'rgba(0, 0, 0, 0)';
          ctx.beginPath();
          ctx.rect(v.x - 2 / 3, v.y - 2 / 3, 2, 2);
          ctx.fill();
        },
        cellIdFromPoint(x, y) {
          // We build the treemap on-demand
          if (this.treemap === null) {
            this.treemap = this.buildTreemap();
          }
          // Get the Voronoi cells from the tree map given x,y
          const items = this.treemap.retrieve({ x, y });
          let iItem = items.length;
          const { cells } = this.diagram;
          let cell; let
            cellid;
          while (iItem--) {
            cellid = items[iItem].cellid;
            cell = cells[cellid];
            if (cell.pointIntersection(x, y) > 0) {
              return cellid;
            }
          }
          return undefined;
        }
      }
    }
  },
  props: {
    size: {
      type: Object,
      default: () => {
        return {
          width: 800,
          height: 600
        }
      }
    },
    cities: {
      type: Array,
      default: []
    },
    rows: {
      type: Number,
      default: 50
    },
    cols: {
      type: Number,
      default: 50
    },
    voronoiType: {
      type: String,
      default: ''
    },
    fullyExplored: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    testDist () {
      let hexaa = Hex

      let origin = {
        q: 0,
        r: 1
      }

      let destination = {
        q: 0,
        r: 5
      }
      let dis = distance

      let resultVector = dis(origin, destination)

      let asd = hex_lerp(origin, destination, 5)
      debugger
    },
    handleSize () {
      this.map.bbox.xr = this.size.width
      this.map.bbox.yb = this.size.height
    },
    click (e) {
      let mousePos;
      const canvas = document.getElementById('voronoiCanvas')
      mousePos = this.getMousePos(canvas, e)
      let targetCellId = this.map.cellIdFromPoint(mousePos.x, mousePos.y)
      this.map.renderCell(targetCellId, 'rgba(0, 0, 0, 0)', '#CCC')

      if (!targetCellId) {
        mousePos.x = mousePos.x + 1
        mousePos.y = mousePos.y + 1
        targetCellId = this.map.cellIdFromPoint(mousePos.x, mousePos.y)
      }

      let clickedCell = this.map.diagram.cells.find(cell => cell.site.voronoiId == targetCellId)

      if (!clickedCell) {
        return
      }

      this.cellInfo = clickedCell.site

      if (!this.fullyExplored) {
        highlightCell(this.map, targetCellId, this.colors[this.map.sites.find(x => x.voronoiId == targetCellId).bioma], 'rgba(0, 0, 0, 0)')
      }

      clickedCell.getNeighborIds().forEach(nei => {
        if (!this.fullyExplored) {
          highlightCell(this.map, nei, this.colors[this.map.sites.find(x => x.voronoiId == nei).bioma], 'rgba(0, 0, 0, 0)')
        }
        highlightCell(this.map, nei, 'rgba(0, 0, 0, 0)', 'red')
      })
    },
    getMousePos(canvas, evt) {
      const rect = canvas.getBoundingClientRect()
      return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
      }
    },
    perlin () {
      /* esilnt-disable */
      console.log('loading perlin')

      this.$store.commit('resetBiomas')

      return new Promise (resolve => {

        resolve(import('@/scripts/perlin.js').then((perlin) => {
          console.log('applying perlin...')

          this.noise = perlin.default.noise

          // this.noise = noise

          // this.rows = this.grid.length;
          // this.cols = this.grid[0].length;

          if (!this.seed) {
            this.seed = Math.floor(Math.random() * 100)
          }

          this.noise.seed(this.seed)

          const width = this.size.width
          const height = this.size.height
          let grid = []

          let arrayWidth = this.rows
          let arrayHeight = this.cols

          let centerX = arrayWidth / 2 -1; //find center of the array
          let centerY = arrayHeight / 2 -1; //find center of the array


          if (this.applyGradient) {
            this.gradientArray = []

            for (let x = 0; x < arrayWidth; x++) {
              for (let y = 0; y < arrayHeight; y++) {
                let distanceX = (centerX - x) * (centerX - x);
                let distanceY = (centerY - y) * (centerY - y);

                //find distance from center
                let distanceToCenter = Math.sqrt(distanceX + distanceY);

                //divide distance by one of the sides (width or height). 
                //by messing with this line you can easily alter the gradient
                distanceToCenter = distanceToCenter / arrayHeight; 

                if (!this.gradientArray[x]) {
                  this.gradientArray[x] = []
                }

                this.gradientArray[x][y] = 1 - distanceToCenter - 0.5 //set value
              }
            }
          }

          for(let row = 0; row < this.rows; row++) {
            grid.push([])
            for(let col = 0; col < this.cols; col++) {
              grid[row].push(0)
              var value = this.noise.simplex2(row / this.rows, col / this.cols);

              let cellID
              if (this.voronoiType == 'square') {

                cellID = (row * this.rows) + col
              } else if (this.voronoiType == 'hex') {
                if (!this.hexGrid[row][col]) {
                  continue
                }

                cellID = this.map.cellIdFromPoint(this.hexGrid[row][col].x, this.hexGrid[row][col].y)
              } else if (this.voronoiType == 'squareRand') {
                if (!this.sqGrid[row][col]) {
                  continue
                }

                cellID = this.map.cellIdFromPoint(this.sqGrid[row][col].x, this.sqGrid[row][col].y)
              } else {

                cellID = this.map.cellIdFromPoint(row * (width/this.rows), col * (height/this.cols))
              }


              if (this.fullyExplored) {
                highlightCell(this.map, cellID, '#0a1d33')
              }
              this.$store.dispatch('setMapSiteChars', {cellID, chars: { bioma: 'deepwater' }})

              grid[row][col] = value

              if (this.applyGradient && this.gradientArray[row][col] < 0.2) {
                value = value * this.gradientArray[row][col]
              }

              if (value > -0.5 && value < 0.08) {
                if (cellID) {
                  if (this.fullyExplored) {
                    highlightCell(this.map, String(cellID), '#163c68')
                  }
                  this.$store.dispatch('setMapSiteChars', {cellID, chars: { bioma: 'water' }})
                }
              }
              if (value > 0.08 && value < 0.2) {
                if (cellID) {
                  if (this.fullyExplored) {
                    highlightCell(this.map, String(cellID), '#8da9c1')
                  }
                  this.$store.dispatch('setMapSiteChars', {cellID, chars: { bioma: 'shore' }})
                }
              }
              if (value > 0.2 && value < 0.4) {
                if (cellID) {
                  if (this.fullyExplored) {
                    highlightCell(this.map, String(cellID), '#b0aa8c')
                  }
                  this.$store.dispatch('setMapSiteChars', {cellID, chars: { bioma: 'sand' }})
                }
              }
              if (value > 0.4 && value < 0.5) {
                if (cellID) {
                  if (this.fullyExplored) {
                    highlightCell(this.map, String(cellID), '#8eae71')
                  }
                  this.$store.dispatch('setMapSiteChars', {cellID, chars: { bioma: 'grass' }})
                }
              }
              if (value > 0.5 && value < 0.6) {
                if (cellID) {
                  if (this.fullyExplored) {
                    highlightCell(this.map, String(cellID), '#5a915b')
                  }
                  this.$store.dispatch('setMapSiteChars', {cellID, chars: { bioma: 'forrest' }})
                }
              }
              if (value > 0.6 && value < 0.8) {
                if (cellID) {
                  if (this.fullyExplored) {
                    highlightCell(this.map, String(cellID), '#417534')
                  }
                  this.$store.dispatch('setMapSiteChars', {cellID, chars: { bioma: 'deepforrest' }})
                }
              }
              if (value > 0.8) {
                if (cellID) {
                  if (this.fullyExplored) {
                    highlightCell(this.map, String(cellID), '#7a5645')
                  }
                  this.$store.dispatch('setMapSiteChars', {cellID, chars: { bioma: 'mountain' }})
                }
              }
            }
          }

          this.$store.commit('handleMapSitesBiomas')
          
          if (this.cities.length) {
            this.handleCities()
          }

          console.log('Done!')
          this.loading = false
        }))
      })
    },
    placeIcon (place, img) {
      var x = []
      var y = []

      this.map.diagram.cells.find(cell => cell.site.voronoiId == place).halfedges.forEach(halfedge => {
          x.push(halfedge.edge.va.x)
          x.push(halfedge.edge.vb.x)
          y.push(halfedge.edge.va.y)    
          y.push(halfedge.edge.vb.y)    
      })

      let xAvg = x => x.reduce((a,b) => a + b, 0) / x.length
      let yAvg = y => y.reduce((a,b) => a + b, 0) / y.length

      let icon = new Image()
      icon.src = quest_marker
      if (img) {
        icon.src = img
      }

      icon.onload = () => {
        document.getElementById('voronoiCanvas').getContext('2d').drawImage(icon, xAvg(x)-15, yAvg(y)-15, 30, 30);
      }
    },
    handleCities () {
      this.cities.forEach(city => {
        if (this.$store.state.groupSites[city.place].length) {
          const cellID = getRandomFrom(this.$store.state.groupSites[city.place])
          this.placeIcon(cellID, this.images[`${city.race}_city`])

          this.$store.dispatch('setMapSiteChars', {cellID, chars: { city: city }})
        }
      })
    }
  },
  mounted () {
    if (this.voronoiType == 'hex') {
      this.hexGrid = generateHexGrid(this.rows, this.cols, 800, 600)
      this.map.sites = this.hexGrid.flat().sort(x => x.voronoiId)
    } else if (this.voronoiType == 'hexRand') {
      this.hexGrid = generateHexGrid(this.rows, this.cols, 800, 600, true)
      this.map.sites = this.hexGrid.flat().sort(x => x.voronoiId)
    } else if (this.voronoiType == 'square') {
      this.map.sites = generateGrid(this.rows, this.cols, 800, 600, this.size.width / this.rows).flat().sort(x => x.voronoiId)
    } else if (this.voronoiType == 'squareRand') {
      
      this.sqGrid = generateGrid(this.rows, this.cols, 800, 600, 0, true)
      this.map.sites = this.sqGrid.flat().sort(x => x.voronoiId)
    } else {
      this.map.sites = voronoi.sites
    }

    this.handleSize()

    this.map.init(false).then(res => {
      this.$store.commit('saveMap', { voronoi: this.map.voronoi, sites: this.map.sites})
      console.log(res)
    })
  }
}
</script>
