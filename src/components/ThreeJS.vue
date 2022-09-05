<script lang="ts">
import { defineComponent } from "vue";
import * as three from 'three';
import * as bitwise from '../Bitwise.ts';

export default defineComponent({
  async mounted() {
    function renderSize(renderer:three.WebGLRenderer):three.Vector2 {
      const canvas = renderer.domElement;
      const pixelRatio = window.devicePixelRatio;
      const width  = canvas.clientWidth  * pixelRatio | 0;
      const height = canvas.clientHeight * pixelRatio | 0;
      return new three.Vector2(width, height);
    }

    const renderer = new three.WebGLRenderer({
      canvas: this.$refs['canvas'],
    });
    const { width, height } = renderSize(renderer);

    const scene = new three.Scene();
    // Point a camera at 0,0
    const camera = new three.OrthographicCamera(width/-2, width/2, height/2, height/-2, 0, 1000);
    camera.position.z = 2;

    // Load tileset
    const tileset = new bitwise.Tileset({
      url: "/Tilesets/TS_Dirt.png",
      tileWidth: 16,
    });
    await tileset.load();

    // Add tilemap
    const tilemap = new bitwise.Tilemap();
    tilemap.addTileset( "dirt", tileset );
    tilemap.setTile( new three.Vector2(0, 0), "dirt", 3 );
    scene.add( tilemap );

    function animate(timeMs) {
      const time = timeMs * 0.001;
      requestAnimationFrame( animate );

      // XXX

      if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
      }

      renderer.render( scene, camera );
    };

    function resizeRendererToDisplaySize(renderer) {
      const canvas = renderer.domElement;
      const render = renderSize(renderer);
      const needResize = canvas.width !== render.width || canvas.height !== render.height;
      if (needResize) {
        renderer.setSize(width, height, false);
      }
      return needResize;
    }

    animate();
  },
});
</script>

<template>
  <canvas ref="canvas" />
</template>

<style>
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
</style>
