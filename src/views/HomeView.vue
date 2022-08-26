<template>
  <div class="home">
    <newMap
      :key="rerender"
      :cities="cities"
      :rows="50"
      :cols="50"
      :voronoiType="selectedType"
      :fullyExplored="explored"
    />
    <label for="explored">
      <input id="explored" type="checkbox" v-model="explored">
      explored
    </label>
    <label for="weird">
      <input id="weird" type="radio" v-model="selectedType" value="weird">
      weird
    </label>
    <label for="hex">
      <input id="hex" type="radio" v-model="selectedType" value="hex">
      hex
    </label>
    <label for="hexrand">
      <input id="hexrand" type="radio" v-model="selectedType" value="hexRand">
      hexrand
    </label>
    <label for="square">
      <input id="square" type="radio" v-model="selectedType" value="square">
      square
    </label>
    <label for="squareRand">
      <input id="squareRand" type="radio" v-model="selectedType" value="squareRand">
      squareRand
    </label>
  </div>
</template>

<script>
// @ is an alias to /src
import newMap from '@/components/newMap.vue'
import sampleData from '@/assets/sample_data.json'

export default {
  name: 'HomeView',
  components: {
    newMap
  },
  data () {
    return {
      explored: true,
      rerender: 0,
      cities: [],
      selectedType: 'weird'
    }
  },
  mounted () {
    this.cities = sampleData.cities
  },
  watch: {
    selectedType: {
      handler (val) {
        this.selectedType = val
        this.rerender++
      }
    },
    explored: {
      handler (val) {
        this.explored = val
        this.rerender++
      }
    }
  }
}
</script>
