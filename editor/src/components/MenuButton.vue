<script lang="ts">
import { defineComponent } from "vue";
import { computePosition, autoUpdate, flip, shift } from '@floating-ui/dom';

// The currently open menu, if any, so we can close it before showing
// another one
let menuOpen:any;

export default defineComponent({
  props: [ 'title', 'show', 'placement' ],
  mounted() {
    if ( this.$props.show ) {
      this.open();
    }
  },
  methods: {
    update() {
      computePosition(this.$refs['button'], this.$refs['menu'], {
        placement: this.placement || 'right-start',
        middleware: [ flip(), shift() ],
      }).then(({x, y}) => {
        Object.assign(this.$refs['menu'].style, {
          left: `${x}px`,
          top: `${y}px`,
        });
      });
    },
    open() {
      if ( this.closeHandler ) {
        this.close();
        return;
      }
      if ( menuOpen && menuOpen !== this ) {
        menuOpen.close();
      }
      this.$refs['menu'].style.display = 'block';
      this.update();
      this.cleanup = autoUpdate(this.$refs['button'], this.$refs['menu'], () => {
        this.update();
      });
      this.closeHandler = this.close.bind(this);
      this.$nextTick( () => document.body.addEventListener( 'click', this.closeHandler ) );
      menuOpen = this;
    },
    close() {
      this.$refs['menu'].style.display = '';
      this.cleanup();
      document.body.removeEventListener( 'click', this.closeHandler );
      this.closeHandler = null;
      this.$emit( 'close' );
      menuOpen = null;
    },
  },
});
</script>

<template>
  <div>
    <div class="menu-button-slot" ref="button" @click.stop="open">
      <slot name="button">
        <button class="menu-button">
          <slot name="title">{{title}}</slot>
        </button>
      </slot>
    </div>
    <div ref="menu" role="menu" class="menu">
      <slot/>
    </div>
  </div>
</template>

<style>
  .menu-button {
    border: 1px solid var(--bw-color);
    color: var(--bw-color);
    background: var(--bw-border-color);
    border-radius: 5px;
  }

  .menu {
    display: none;
    position: absolute;
    width: max-content;
    top: 0;
    left: 0;
    background: var(--bw-background-color);
    border-radius: 5px;
    border: 3px solid var(--bw-border-color);
    color: var(--bw-color);
    z-index: 10000;
    box-shadow: 5px 5px 15px 5px #66666666;
  }

  .menu ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .menu li {
    padding: 0.2em;
    display: block;
  }

  .menu hr {
    margin: 0;
    padding: 0;
    height: 0.3em;
    border: none;
    background: var(--bw-border-color);
  }

  .menu li:hover {
    cursor: pointer;
    color: var(--bw-color-hover);
    background: var(--bw-background-color-hover);
  }

  .menu .disabled {
    pointer-events: none;
    color: var(--bw-color-disabled);
  }

  .menu li.hr {
    padding: 0;
  }
  .menu li.hr:hover {
    cursor: default;
    background: transparent;
  }
</style>
