<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Example from './Example.svelte';
  import { fn } from 'storybook/test';
  import '../app.css'

  // More on how to set up stories at: https://storybook.js.org/docs/writing-stories
  const { Story } = defineMeta({
    title: 'Example/Example',
    component: Example,
    tags: ['autodocs'],
    argTypes: {
      backgroundColor: { control: 'color' },
      size: {
        control: { type: 'select' },
        options: ['small', 'medium', 'large'],
      },
    },
    args: {
      onclick: fn(),
    }
  });
</script>

<!-- More on writing stories with args: https://storybook.js.org/docs/writing-stories/args -->
<Story name="Primary" />
