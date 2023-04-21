<template>
  <div class="container">
    <div
      v-if="true"
    >
      voronoiMap
      <button @click="reRenderVoronoi()">VoronoiDemo</button>
      <button @click="colorOuterRim()">colorOuterRim</button>
      <button @click="paintNeighbors2()">paintNeighbors2</button>
      <button @click="THEhighlightSector()">highlightSector</button>
      <input type="text" v-model="sectorTest">
      <button @click="placeIcon(sectorTest)">placeIcon</button>
      <button @click="placeForrest()">placeIcon forrest</button>
      <button @click="placeAllForrest()">placeAllForrest</button>
      <button @click="placeAllTiles()">placeAllTiles</button>
      <button @click="testPerlin()">testPerlin</button>
      <button @click="VoronoiDemo.relaxSites()">relaxSites</button>
    </div>
    <div>
      <div
        v-if="loading"
      >
        loading...
      </div>
      <canvas
        v-show="!loading"
        id="voronoiCanvas"
        :width="800"
        :height="600"
        @click="logMe($event)"
      ></canvas>
    </div>
  </div>
</template>

<script>
import Voronoi from '../scripts/rhill-voronoi-core.js';
import QuadTree from '../scripts/QuadTree.js';
import { highlightCell, highlightSector, addQuestMarker, getRandomFrom } from '../scripts/helpers.js';

import { mapGetters } from 'vuex'

import quest_marker from '../assets/icons/quest_marker.png';
import tree from '../assets/icons/tree.png';
import deepTree from '../assets/icons/deepTree.png';
import palmTree from '../assets/icons/palmTree.png';
import mountain from '../assets/icons/mountain.webp';

export default {
  data() {
    return {
      range: 1,
      loading: true,
      sectorTest: null,
      noise: null,
      gradientArray: [],
      applyGradient: false,
      getRandomFrom: getRandomFrom,
      VoronoiDemo: {
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
        init(regenerate, that) {
          this.canvas = document.getElementById('voronoiCanvas');
          if (regenerate) {
            if (regenerate == 'mockme') {
              this.randomSites(300, true, true, that);
            } else {
              this.randomSites(10, true);
            }
          }
          this.render();
        },
        clearSites() {
          this.sites = [];
          this.treemap = null;
          this.diagram = this.voronoi.compute(this.sites, this.bbox);
          // this.updateStats();
        },
        randomSites(n, clear, fromMock, that) {
          if (clear) { this.sites = []; }
          // create vertices
          const xmargin = this.canvas.width * this.margin;
          const ymargin = this.canvas.height * this.margin;
          const xo = xmargin;
          const dx = this.canvas.width - xmargin * 2;
          const yo = ymargin;
          const dy = this.canvas.height - ymargin * 2;
          if (fromMock) {
            this.sites = that.$store.state.voronoi.sites
          } else {
            for (let i = 0; i < n; i++) {
              this.sites.push({ x: self.Math.round((xo + self.Math.random() * dx) * 10) / 10, y: self.Math.round((yo + self.Math.random() * dy) * 10) / 10 });
            }
          }
          this.treemap = null;
          this.diagram = this.voronoi.compute(this.sites, this.bbox);
          // this.updateStats();
        },
        cellCentroid: function(cell) {
          var x = 0, y = 0,
            halfedges = cell.halfedges,
            iHalfedge = halfedges.length,
            halfedge,
            v, p1, p2;
          while (iHalfedge--) {
            halfedge = halfedges[iHalfedge];
            p1 = halfedge.getStartpoint();
            p2 = halfedge.getEndpoint();
            v = p1.x*p2.y - p2.x*p1.y;
            x += (p1.x+p2.x) * v;
            y += (p1.y+p2.y) * v;
            }
          v = this.cellArea(cell) * 6;
          return {x:x/v,y:y/v};
        },
        distance: function(a, b) {
          var dx = a.x-b.x,
            dy = a.y-b.y;
          return Math.sqrt(dx*dx+dy*dy);
        },
        compute: function(sites, fromRelax, doperlin, that) {
          this.sites = sites;
          this.voronoi.recycle(this.diagram);
          this.diagram = this.voronoi.compute(sites, this.bbox);
          // this.updateStats();
          if (!fromRelax) {
            this.render()
          }

          if (doperlin) {
            that.$nextTick(() => {
              that.testPerlin()
            })
          }
        },
        cellArea: function(cell) {
          var area = 0,
            halfedges = cell.halfedges,
            iHalfedge = halfedges.length,
            halfedge,
            p1, p2;
          while (iHalfedge--) {
            halfedge = halfedges[iHalfedge];
            p1 = halfedge.getStartpoint();
            p2 = halfedge.getEndpoint();
            area += p1.x * p2.y;
            area -= p1.y * p2.x;
            }
          area /= 2;
          return area;
        },
        relaxSites: function(that) {
          if (!this.diagram) {return;}
          var cells = this.diagram.cells,
            iCell = cells.length,
            cell,
            site, sites = [],
            again = false,
            rn, dist;
          var p = 1 / iCell * 0.1;
          while (iCell--) {
            cell = cells[iCell];
            rn = Math.random();
            // probability of apoptosis
            if (rn < p) {
              continue;
              }
            site = this.cellCentroid(cell);
            dist = this.distance(site, cell.site);
            again = again || dist > 1;
            // don't relax too fast
            if (dist > 2) {
              site.x = (site.x+cell.site.x)/2;
              site.y = (site.y+cell.site.y)/2;
              }
            // probability of mytosis
            if (rn > (1-p)) {
              dist /= 2;
              sites.push({
                x: site.x+(site.x-cell.site.x)/dist,
                y: site.y+(site.y-cell.site.y)/dist,
                });
              }
            sites.push(site);
          }
          this.compute(sites, true);
          if (again) {
            var me = this;
            // this.timeout = setTimeout(function(){
            // }, 1);
            me.relaxSites(that)
          } else {
            this.compute(sites, false, true, that);
          }
        },
        recompute() {
          this.treemap = null;
          debugger
          this.diagram = this.voronoi.compute(this.sites, this.bbox);
          // this.updateStats();
        },
        // updateStats: function() {
        //  if (!this.diagram) {return;}
        //  var e = document.getElementById('voronoiStats');
        //  if (!e) {return;}
        //  e.innerHTML = '('+this.diagram.cells.length+' Voronoi cells computed from '+this.diagram.cells.length+' Voronoi sites in '+this.diagram.execTime+' ms &ndash; rendering <i>not</i> included)';
        //  },
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
        // cellUnderMouse(ev) {
        //   if (!this.diagram) { return; }
        //   const canvas = document.getElementById('voronoiCanvas');
        //   if (!canvas) {
        //     return;
        //   }
        //   // >>> http://www.quirksmode.org/js/events_properties.html#position
        //   let x = 0;
        //   let y = 0;
        //   if (!ev) {
        //     ev = window.event;
        //   }
        //   if (ev.pageX || ev.pageY) {
        //     x = ev.pageX;
        //     y = ev.pageY;
        //   } else if (e.clientX || e.clientY) {
        //     x = ev.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        //     y = ev.clientY + document.body.scrollTop + document.documentElement.scrollTop;
        //   }
        //   // <<< http://www.quirksmode.org/js/events_properties.html#position
        //   x -= canvas.offsetLeft;
        //   y -= canvas.offsetTop;
        //   cellid = this.cellIdFromPoint(x, y);
        //   if (this.lastCell !== cellid) {
        //     if (this.lastCell !== undefined) {
        //       this.renderCell(this.lastCell, 'rgba(0, 0, 0, 0)', '#000');
        //     }
        //     if (cellid !== undefined) {
        //       this.renderCell(cellid, 'rgba(0, 0, 0, 0)', '#00f');
        //     }
        //     this.lastCell = cellid;
        //   }
        //   document.getElementById('voronoiCellid').innerHTML = `(${x},${y}) = ${cellid}`;
        // },
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
            ctx.moveTo(v.x, v.y);
            v = edge.vb;
            ctx.lineTo(v.x, v.y);
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
      }
    }
  },
  computed: {
    ...mapGetters(['getScreenSize']),
    waterTiles () {
      return this.$store.state.groupSites.water
    },
    shoreTiles () {
      return this.$store.state.groupSites.shore
    },
    sandTiles () {
      return this.$store.state.groupSites.sand
    },
    grassTiles () {
      return this.$store.state.groupSites.water
    },
    forrestTiles () {
      return this.$store.state.groupSites.forrest
    },
    deepforrestTiles () {
      return this.$store.state.groupSites.deepforrest
    },
    mountainTiles () {
      return this.$store.state.groupSites.mountain
    }
  },
  props: {
    background: {
      type: String,
      default: "https://images.photowall.com/products/58243/galaxy-1.jpg?h=699&q=85"
    },
    useMock: {
      type: Boolean
    },
    mockSites: {
      type: Array
    }
  },
  methods: {
    logMe(e) {
      let mousePos;
      const canvas = document.getElementById('voronoiCanvas');
      mousePos = this.getMousePos(canvas, e);
      const targetCellId = this.VoronoiDemo.cellIdFromPoint(mousePos.x, mousePos.y)
      this.VoronoiDemo.renderCell(targetCellId, 'rgba(0, 0, 0, 0)', '#CCC')

      console.log(this.$store.state.voronoi.sites.find(x => x.voronoiId == targetCellId))

      if (this.getRange().find(x => x == targetCellId) != undefined) {
        this.$emit('travel', targetCellId)
      } else {
        console.log('out of range')
      }
    },
    THEhighlightSector (sector, fillcolor) {
      highlightSector(this.VoronoiDemo, sector ? sector : this.sectorTest, this.$store.state.locations, fillcolor ? fillcolor : 'purple', fillcolor ? fillcolor : 'green')
    },
    getRange () {
      const playerRange = this.range

      if (playerRange == 2) {
        return this.getRangeTwo()
      }
      return this.$store.state.locations[this.$store.state.currentLocation].cell.getNeighborIds()
    },
    getRangeTwo () {
      const current = this.$store.state.locations[this.$store.state.currentLocation].cell.site.voronoiId
      
      const allNeighbors = this.$store.state.locations[this.$store.state.currentLocation].cell.getNeighborIds().flatMap(x => {
        return this.VoronoiDemo.diagram.cells[x].getNeighborIds()
      })

      const unique = new Set(allNeighbors)

      unique.delete(current)

      return [...unique]
    },
    paintNeighbors () {
      if (this.range == 2) {
        this.paintNeighbors2()
        return
      }

      this.$store.state.locations[this.$store.state.currentLocation].cell.getNeighborIds().forEach(cell => {
        this.VoronoiDemo.renderCell(cell, 'rgb(173 216 230 / 0.3)', 'green');
      })
    },
    paintNeighbors2 () {
      this.getRangeTwo().forEach(cell => {
        this.VoronoiDemo.renderCell(cell, 'rgb(173 216 230 / 0.3)', 'green');
      })
    },
    testPerlin () {
      /* esilnt-disable */
      console.log('loading perlin')

      this.$store.commit('resetBiomas')

      import('../scripts/perlin.js').then((perlin) => {
        console.log('applying perlin...')

        this.noise = perlin.default.noise

        // this.noise = noise

        this.rows = 50
        this.cols = 50
        // this.rows = this.grid.length;
        // this.cols = this.grid[0].length;

        this.noise.seed(Math.random())

        const width = 800
        const height = 600
        let grid = []

        let arrayWidth = this.rows
        let arrayHeight = this.cols

        let centerX = arrayWidth / 2 -1; //find center of the array
        let centerY = arrayHeight / 2 -1; //find center of the array

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

            this.gradientArray[x][y] = 1 - distanceToCenter - 0.4 //set value
          }
        }


        for(let row = 0; row < this.rows; row++) {
          grid.push([])
          for(let col = 0; col < this.cols; col++) {
            grid[row].push(0)
            var value = this.noise.simplex2(row / this.rows, col / this.cols);

            let cellID = this.VoronoiDemo.cellIdFromPoint(row * (width/this.rows), col * (height/this.cols))

            highlightCell(this.VoronoiDemo, cellID, '#0a1d33')
            this.$store.dispatch('setSiteChars', {cellID, chars: { bioma: 'water' }})
            // if (value > -0.4) {
            //   grid[row][col] = 0
            //   highlightCell(this.VoronoiDemo, cellID, '#163c68')
            //   // this.THEhighlightSector(String(this.VoronoiDemo.cellIdFromPoint(row, col)), 'blue')
            // }
            grid[row][col] = value

            if (this.applyGradient) {
              if (this.gradientArray[row][col] > 0.5) {
                // console.log('value ' + value)
              } else {
                value = this.gradientArray[row][col]
              }
              if (value > 0 && value < 0.1) {
                grid[row][col] = 1
                if (cellID) { highlightCell(this.VoronoiDemo, String(cellID), '#8da9c1') }
                // this.THEhighlightSector(String(this.VoronoiDemo.cellIdFromPoint(row, col)), 'lightblue')
              }
              if (value > 0.1 && value < 0.3) {
                grid[row][col] = 1
                if (cellID) { highlightCell(this.VoronoiDemo, String(cellID), '#b0aa8c') }
                // this.THEhighlightSector(String(this.VoronoiDemo.cellIdFromPoint(row, col)), 'yellow')
              }
              if (value > 0.3 && value < 0.4) {
                grid[row][col] = 2
                if (cellID) { highlightCell(this.VoronoiDemo, String(cellID), '#8eae71') }
                // this.THEhighlightSector(String(this.VoronoiDemo.cellIdFromPoint(row, col)), 'green')
              }
              if (value > 0.4 && value < 0.5) {
                grid[row][col] = 2
                if (cellID) { highlightCell(this.VoronoiDemo, String(cellID), '#5a915b') }
                // this.THEhighlightSector(String(this.VoronoiDemo.cellIdFromPoint(row, col)), 'green')
              }
              if (value > 0.7) {
                grid[row][col] = 3
                if (cellID) { highlightCell(this.VoronoiDemo, String(cellID), '#417534') }
                // this.THEhighlightSector(String(this.VoronoiDemo.cellIdFromPoint(row, col)), 'brown')
              }
            } else {
              if (value > -0.5 && value < 0.08) {
                if (cellID) {
                  highlightCell(this.VoronoiDemo, String(cellID), '#163c68')
                  this.$store.dispatch('setSiteChars', {cellID, chars: { bioma: 'water' }})
                }
              }
              if (value > 0.08 && value < 0.2) {
                if (cellID) {
                  highlightCell(this.VoronoiDemo, String(cellID), '#8da9c1')
                  this.$store.dispatch('setSiteChars', {cellID, chars: { bioma: 'shore' }})
                }
              }
              if (value > 0.2 && value < 0.4) {
                if (cellID) {
                  highlightCell(this.VoronoiDemo, String(cellID), '#b0aa8c')
                  this.$store.dispatch('setSiteChars', {cellID, chars: { bioma: 'sand' }})
                }
              }
              if (value > 0.4 && value < 0.5) {
                if (cellID) {
                  highlightCell(this.VoronoiDemo, String(cellID), '#8eae71')
                  this.$store.dispatch('setSiteChars', {cellID, chars: { bioma: 'grass' }})
                }
              }
              if (value > 0.5 && value < 0.6) {
                if (cellID) {
                  highlightCell(this.VoronoiDemo, String(cellID), '#5a915b')
                  this.$store.dispatch('setSiteChars', {cellID, chars: { bioma: 'forrest' }})
                }
              }
              if (value > 0.6 && value < 0.8) {
                if (cellID) {
                  highlightCell(this.VoronoiDemo, String(cellID), '#417534')
                  this.$store.dispatch('setSiteChars', {cellID, chars: { bioma: 'deepforrest' }})
                }
              }
              if (value > 0.8) {
                if (cellID) {
                  highlightCell(this.VoronoiDemo, String(cellID), '#7a5645')
                  this.$store.dispatch('setSiteChars', {cellID, chars: { bioma: 'mountain' }})
                }
              }
            }
          }
        }

        this.$store.commit('handleSitesBiomas')
        
        console.log('Done!')
        this.loading = false
      })
    },
    getMousePos(canvas, evt) {
      const rect = canvas.getBoundingClientRect();
      return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top,
      };
    },
    paintCurrentLocation() {
      const cellID = Object.keys(this.$store.state.locations).indexOf(this.$store.state.currentLocation);
      this.VoronoiDemo.renderCell(cellID, 'rgb(173 216 230 / 0.3)', 'red');
    },
    paintKnownLocations () {
      this.$store.state.visitedLocations.forEach(cell => {
        this.VoronoiDemo.renderCell(cell, 'rgb(203 203 203 / 0.3)', '#000');
      })
    },
    resetVoronoi() {
      const weirdCondition = !Object.keys(this.$store.state.locations).length;
      if (weirdCondition) {
        this.VoronoiDemo.init(true);
        this.$store.commit('handleCells', this.VoronoiDemo.diagram.cells);
        this.$store.commit('saveVoronoi', { sites: this.VoronoiDemo.sites, diagram: this.VoronoiDemo.diagram });
      } else {
        this.VoronoiDemo.diagram = this.$store.state.voronoi.diagram;
        this.VoronoiDemo.sites = this.$store.state.voronoi.sites;
        this.VoronoiDemo.init(false);
      }
    },
    colorOuterRim() {
      this.VoronoiDemo.diagram.cells.filter(x => x.closeMe).forEach(x => {
        this.VoronoiDemo.renderCell(x.site.voronoiId, 'rgba(0, 0, 0, 0)', 'blue');
      })
    },
    reRenderVoronoi() {
      this.VoronoiDemo.diagram = this.$store.state.voronoi.diagram;
      this.VoronoiDemo.sites = this.$store.state.voronoi.sites;
      this.VoronoiDemo.init(false);

      // this.paintNeighbors();
      // this.paintKnownLocations();
      // this.paintCurrentLocation();
      // this.addMarkers()

      this.loading = false
    },
    placeForrest () {
      this.placeIcon(getRandomFrom(this.forrestTiles))
    },
    placeAllForrest () {
      this.forrestTiles.forEach(site => {
        this.placeIcon(site, tree)
      })
    },
    placeAllTiles () {
      this.forrestTiles.forEach(site => {
        this.placeIcon(site, tree)
      })
      this.deepforrestTiles.forEach(site => {
        this.placeIcon(site, deepTree)
      })
      this.sandTiles.forEach(site => {
        this.placeIcon(site, palmTree)
      })
      this.mountainTiles.forEach(site => {
        this.placeIcon(site, mountain)
      })
    },
    placeIcon (place, img) {
      var x = []
      var y = []

      Object.values(this.$store.state.locations).find(location => location.cell.site.voronoiId == place).cell.halfedges.forEach(halfedge => {
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
    addMarkers () {
      this.$store.state.activeQuests.forEach(quest => {
        if (quest.steps[quest.currentStep].goto) {
          highlightSector(this.VoronoiDemo, quest.steps[quest.currentStep].goto, this.$store.state.locations, quest.color.replace('rgb', 'rgba').replace(')', ', 0.3)'), quest.color)
          addQuestMarker(this.$store.state.locations, quest.steps[quest.currentStep].goto)
        }
      })
    },
    testNewWay () {
      this.VoronoiDemo.treemap = null;
      debugger
      this.VoronoiDemo.diagram = this.VoronoiDemo.voronoi.compute(this.mockSites, this.VoronoiDemo.bbox)
      this.VoronoiDemo.render()
    }
  },
  mounted () {
    var background = new Image()
    // var background2 = new Image();
    background.src = this.background
    // background2.src = "https://s3.envato.com/files/57f1e686-a417-46e2-aeab-84af7f6ef87a/inline_image_preview.jpg";

    // // Make sure the image is loaded first otherwise nothing will draw.
    background.onload = () => {
      document.getElementById('voronoiCanvas').getContext('2d').drawImage(background,0,0)
      if (this.mockSites) {
        this.VoronoiDemo.sites = this.mockSites
      }
      this.reRenderVoronoi()
      if (!this.useMock) {
        console.log('relaxing...')
        console.log('sites before relax ' + this.VoronoiDemo.sites)
        this.VoronoiDemo.relaxSites(this)
      }
    }
  },
};

</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
