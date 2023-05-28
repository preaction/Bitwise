
import {describe, test, expect, jest} from '@jest/globals';
import { flushPromises, mount } from '@vue/test-utils';
import MockBackend from '../../../mock/backend.js';
import Project from '../../../../src/model/Project.js';
import MarkdownView from '../../../../src/components/MarkdownView.vue';
import ProjectItem from '../../../../src/model/ProjectItem.js';
import Tab from '../../../../src/model/Tab.js';

const backend = new MockBackend();
const project = new Project(backend, "ProjectName");
const baseUrl = `https://example.game/${project.name}`;
const provide = { backend, project, baseUrl };

describe( 'MarkdownView', () => {
  test( 'shows markdown', async () => {
    const markdown = `# Markdown

This is a Markdown document

## Heading

This is a second heading
`
    const projectItem = new ProjectItem(project, "README.markdown", "MarkdownView");
    jest.spyOn( projectItem, 'read' ).mockResolvedValue( markdown );
    const tab = new Tab( projectItem );
    const wrapper = mount( MarkdownView, {
      props: {
        modelValue: tab,
      },
      global: { provide },
    });
    await flushPromises();
    await wrapper.vm.$nextTick();

    expect( wrapper.get('.markdown-view h1').text() ).toBe( 'Markdown' );
    expect( wrapper.get('.markdown-view h1 + p').text() ).toBe( 'This is a Markdown document' );
    expect( wrapper.get('.markdown-view h2').text() ).toBe( 'Heading' );
    expect( wrapper.get('.markdown-view h2 + p').text() ).toBe( 'This is a second heading' );
  });
});
