<script lang="ts">
import { defineComponent } from "vue";
import * as three from 'three';
import * as bitwise from '../Bitwise.ts';

export default defineComponent({
  data() {
    return {
      layers: [],
      tilesets: [],

      // These non-reactive properties will be set by initThree()
      //renderer: null,
      //scene: null,
      //camera: null,
      //width: null,
      //height: null,
    };
  },

  methods: {
    initThree() {
      // Create the renderer after the <canvas> exists
      const renderer = new three.WebGLRenderer({
        canvas: this.$refs['canvas'],
      });
      this.renderer = renderer;

      // Record the initial render height/width in case it changes. To
      // keep responsiveness, we will reset the renderer size and adjust the
      // camera so that everything looks the same.
      const { width, height } = this.renderSize();
      this.width = width;
      this.height = height;

      const scene = new three.Scene();
      this.scene = scene;

      // Point a camera at 0, 0
      // Frustum size appears to work the same as zoom for an
      // orthographic camera, which makes sense
      const frustumSize = this.frustumSize = 2;
      const camera = new three.OrthographicCamera(frustumSize * (width/-2), frustumSize * (width/2), frustumSize * (height/2), frustumSize * (height/-2), 0);
      this.camera = camera;
      // Z-position determines which objects are rendered? Use z-position
      // for layering?
      camera.position.z = camera.far;
      camera.zoom = 4;
    },

    renderSize():three.Vector2 {
      const canvas = this.renderer.domElement;
      const pixelRatio = window.devicePixelRatio;
      const width  = canvas.clientWidth  * pixelRatio | 0;
      const height = canvas.clientHeight * pixelRatio | 0;
      return new three.Vector2(width, height);
    },

    resizeRendererToDisplaySize() {
      const canvas = this.renderer.domElement;
      const render = this.renderSize();
      const needResize = canvas.width !== render.width || canvas.height !== render.height;
      if (needResize) {
        this.renderer.setSize(this.width, this.height, false);

        // Fix camera settings to maintain exact size/aspect
        const frustumSize = this.frustumSize;
        this.camera.left = frustumSize * (render.width/-2);
        this.camera.right = frustumSize * (render.width/2);
        this.camera.top = frustumSize * (render.height/2);
        this.camera.bottom = frustumSize * (render.height/-2);
        this.camera.updateProjectionMatrix();
      }
      return needResize;
    },
  },

  unmounted() {
    this.renderer.dispose();
    delete this.renderer;
  },

  async mounted() {
    this.initThree();

    // XXX: Scroll controls for zoom
    // XXX: Pinch controls for zoom

    // Load tileset
    const tileset = new bitwise.Tileset({
      src: "/Tilesets/TS_Dirt.png",
      tileWidth: 16,
    });
    await tileset.load();

    // Add tilemap
    const tilemap = new bitwise.Tilemap();
    tilemap.addTileset( "dirt", tileset );
    tilemap.setTile( new three.Vector2(0, 0), "dirt", 3 );
    this.scene.add( tilemap );

    const animate = (timeMs) => {
      if ( !this.renderer ) {
        return;
      }

      const time = timeMs * 0.001;
      requestAnimationFrame( animate );

      // XXX

      if (this.resizeRendererToDisplaySize()) {
        //this.updateCameraAspect();
      }

      this.renderer.render( this.scene, this.camera );
    };

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
