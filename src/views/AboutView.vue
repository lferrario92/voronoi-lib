<template>
  <div class="about">
    <h1>This is an about page</h1>
    <label for="">
      use mock
      <input type="checkbox" v-model="useMock">
    </label>
    <label for="">
      use mock 2
      <input type="checkbox" v-model="useMock2">
    </label>
    <input type="text" v-model="background">
    <voronoiMap
      v-if="voronoiReady"
      :useMock="useMock"
      :mockSites="getsites()"
    />
    <button @click="generate()">generate</button>
  </div>
</template>

<script>
import voronoiMap from '@/components/voronoiMap'
import { voronoi } from '@/assets/mock.js'

export default {
  components: {
    voronoiMap
  },
  data () {
    return {
      voronoiReady: false,
      background: null,
      useMock: false,
      useMock2: false
    }
  },
  methods: {
    getsites () {
      return voronoi.sites
    },
    generate () {
      if (this.voronoiReady) {
        this.$store.commit('resetVoronoi')
        this.voronoiReady = false
      }
      if (this.useMock) {
        this.$store.dispatch('makeVoronoi', 300, voronoi.sites).then(() => {
          this.$store.commit('saveVoronoi', voronoi)
          this.voronoiReady = true
        })
      } else if (this.useMock2) {
        this.$store.dispatch('makeVoronoi').then(() => {
          this.voronoiReady = true
          console.log('handling cells')
          this.$store.commit('handleCells', 'yours')
        })
      } else {
        console.log('making voronoi')
        this.$store.dispatch('makeVoronoi').then(() => {
          this.voronoiReady = true
          console.log('handling cells')
          this.$store.commit('handleCells', 'yours')
        })
      }
    }
  }
}
</script>
