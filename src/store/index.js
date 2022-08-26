import Vue from 'vue'
import Vuex from 'vuex'
import Voronoi from '@/scripts/rhill-voronoi-core.js';

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    numericLocations: true,
    voronoi: {},
    newMap: {},
    locations: {},
    groupSites: {
      deepwater: [],
      water: [],
      shore: [],
      sand: [],
      grass: [],
      forrest: [],
      deepforrest: [],
      mountain: []
    },
    screenSize: {},
    activeQuests: [],
    visitedLocations: [0],
    currentLocation: ''
  },
  getters: {
    getScreenSize: state => {
      return state.screenSize
    },
    getForrestTiles: state => {
      return state.groupSites.forrest
    }
  },
  mutations: {
    saveVoronoi (state, voronoi) {
      state.voronoi = voronoi
    },
    saveMap (state, data) {
      state.newMap = data
    },
    setScreenSize (state, data) {
      state.screenSize = data
    },
    handleCells(state, cells) {
      if (cells == 'yours') {
        cells = this.state.voronoi.diagram.cells
      }
      cells.forEach((cell, index) => {
        const sectorName = state.numericLocations ? cell.site.voronoiId : Math.random().toString(36).substring(7)
        this.state.locations[`${sectorName}`] = {}
        this.state.locations[`${sectorName}`].cell = cell

        if (index == 0) {
          this.state.currentLocation = sectorName
        }
      })
    },
    setNewBioma (state, bioma) {
      state.groupSites[bioma] = []
    },
    pushToBioma (state, data) {
      state.groupSites[data.bioma].push(data.id)
    },
    handleSitesBiomas (state) {
      state.voronoi.sites.forEach(site => {
        if (site.bioma) {
          if (!state.groupSites[site.bioma]) {
            state.groupSites[site.bioma] = []
          }

          state.groupSites[site.bioma].push(site.voronoiId)
        }
      })
    },
    handleMapSitesBiomas (state) {
      state.newMap.sites.forEach(site => {
        if (site.bioma) {
          if (!state.groupSites[site.bioma]) {
            state.groupSites[site.bioma] = []
          }

          state.groupSites[site.bioma].push(site.voronoiId)
        }
      })
    },
    resetVoronoi (state) {
      state.voronoi = {}
    },
    resetBiomas (state) {
      state.groupSites = {
        water: [],
        shore: [],
        sand: [],
        grass: [],
        forrest: [],
        deepforrest: [],
        mountain: []
      }
    }
  },
  actions: {
    makeVoronoi (context, size, sites) {
      return new Promise((resolve) => {
        const voronoi = {
          voronoi: new Voronoi(),
          sites: [],
          diagram: null,
          margin: 0.1,
          canvas: {
            width: context.state.screenSize.width / 2,
            height: context.state.screenSize.height / 2,
          },
          bbox: {
            xl: 0, xr: 800, yt: 0, yb: 600,
          },
          treemap: null,
          randomSites(n, clear, sites) {
            if (clear) { this.sites = []; }
            // create vertices
            const xmargin = this.canvas.width * this.margin;
            const ymargin = this.canvas.height * this.margin;
            const xo = xmargin;
            const dx = this.canvas.width - xmargin * 2;
            const yo = ymargin;
            const dy = this.canvas.height - ymargin * 2;

            if (!sites) {
              for (let i = 0; i < n; i++) {
                this.sites.push({ x: self.Math.round((xo + self.Math.random() * dx) * 10) / 10, y: self.Math.round((yo + self.Math.random() * dy) * 10) / 10 });
              }
            } else {
              this.sites = sites
            }
            this.treemap = null;
            this.diagram = this.voronoi.compute(this.sites, this.bbox);
            // this.updateStats();
          }
        };

        if (!size) size = 300
        voronoi.randomSites(size, true, sites);

        context.commit('saveVoronoi', voronoi);

        resolve(`Voronoi saved`)
      })
    },
    setSiteChars (context, data) {
      let index = context.state.voronoi.sites.findIndex(el => el.voronoiId === data.cellID)
      try {
        context.state.voronoi.sites[index] = Object.assign(context.state.voronoi.sites[index], data.chars)

        // if (!context.state.groupSites[`${data.chars.bioma}`]) {
        //   context.commit('setNewBioma', data.chars.bioma)
        // }

        // if (!context.state.groupSites[`${data.chars.bioma}`].includes(data.cellID)) {
        //   context.commit('pushToBioma', { bioma: data.chars.bioma, id: data.cellID })
        // }
      } catch {
        // console.log('error assigning chars at ' + data.cellID)
      }
    },
    setMapSiteChars (context, data) {
      let index = context.state.newMap.sites.findIndex(el => el.voronoiId === data.cellID)
      try {
        context.state.newMap.sites[index] = Object.assign(context.state.newMap.sites[index], data.chars)

        // if (!context.state.groupSites[`${data.chars.bioma}`]) {
        //   context.commit('setNewBioma', data.chars.bioma)
        // }

        // if (!context.state.groupSites[`${data.chars.bioma}`].includes(data.cellID)) {
        //   context.commit('pushToBioma', { bioma: data.chars.bioma, id: data.cellID })
        // }
      } catch {
        // console.log('error assigning chars at ' + data.cellID)
      }
    },
  },
  modules: {
  }
})
