
import {describe, expect, test, jest, afterEach} from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import Modal from '../../../../src/components/Modal.vue';

const cleanup = [] as Array<()=>void>;
afterEach( () => {
  cleanup.forEach( c => c() );
  cleanup.length = 0;
});

describe('Modal', () => {
  test('not shown by default', async () => {
    const id = "defaultModal";
    const wrapper = mount(Modal, {
      attachTo: document.body,
      props: { id },
    });
    cleanup.push( () => wrapper.unmount() );
    await wrapper.vm.$nextTick();
    expect( wrapper.props('show') ).toBeFalsy();
    const modal = wrapper.get(`#${id}`);
    expect( modal.classes('is-open') ).toBeFalsy();
    expect( modal.attributes('aria-hidden') ).toBe('true');
  });

  test('shown by default when show=true', async () => {
    const id = "shownModal";
    const wrapper = mount(Modal, {
      attachTo: document.body,
      props: { id, show: true },
    });
    cleanup.push( () => wrapper.unmount() );
    await wrapper.vm.$nextTick();
    expect( wrapper.props('show') ).toBeTruthy();
    const modal = wrapper.get(`#${id}`);
    expect( modal.classes('is-open') ).toBeTruthy();
    expect( modal.attributes('aria-hidden') ).toBe('false');
  });

  test('toggle show state', async () => {
    const id = "toggleModal";
    const wrapper = mount(Modal, {
      attachTo: document.body,
      props: { id },
    });
    cleanup.push( () => wrapper.unmount() );

    await wrapper.vm.$nextTick();
    expect( wrapper.props('show') ).toBeFalsy();
    const modal = wrapper.get(`#${id}`);
    expect( modal.classes('is-open') ).toBeFalsy();
    expect( modal.attributes('aria-hidden') ).toBe('true');

    await wrapper.setProps({ show: true });
    //await wrapper.vm.$nextTick();
    expect( wrapper.props('show') ).toBeTruthy();
    expect( modal.classes('is-open') ).toBeTruthy();
    expect( modal.attributes('aria-hidden') ).toBe('false');
  });
});
