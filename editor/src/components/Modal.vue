<script lang="ts">
import { defineComponent } from "vue";
import MicroModal from 'micromodal';
export default defineComponent({
  props: [ 'id', 'title', 'show' ],
  methods: {
    open() {
      MicroModal.show( this.id );
    },
    close() {
      MicroModal.close( this.id );
      this.$emit( 'close' );
    },
  },
});
</script>

<template>
  <div :id="id" class="modal" :class="show ? 'is-open' : ''" aria-hidden="true">
    <div tabindex="-1" class="modal__overlay">
      <div role="dialog" aria-modal="true" :aria-labelledby="id + '-title'" class="modal__container" >
        <header class="modal__header">
          <h2 :id="id + '-title'" class="modal__title">
            {{title}}
          </h2>
          <!--
          <button aria-label="Close modal" @click="close"
            class="modal__close"></button>
          -->
        </header>
        <div :id="id + '-content'" class="modal__content">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
  .modal {
    display: none;
  }

  .modal.is-open {
    display: block;
  }

  .modal__overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.6);
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .modal__container {
    background-color: var(--bw-background-color);
    border: 2px outset var(--bw-border-color);
    padding: 30px;
    max-width: 500px;
    max-height: 100vh;
    border-radius: 4px;
    overflow-y: auto;
    box-sizing: border-box;
    box-shadow: var(--bw-box-shadow);
  }

  .modal__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .modal__title {
    margin-top: 0;
    margin-bottom: 0;
    font-weight: 600;
    font-size: 1.25rem;
    line-height: 1.25;
    box-sizing: border-box;
  }

  .modal__close {
    background: transparent;
    border: 0;
  }

  .modal__header .modal__close:before { content: "\2715"; }

  .modal__content {
    margin-top: 2rem;
    margin-bottom: 2rem;
    line-height: 1.5;
  }
</style>
