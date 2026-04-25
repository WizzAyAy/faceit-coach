import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import Logo from '../components/Logo.vue'

describe('logo', () => {
  it('should render an SVG with the default size', () => {
    const wrapper = mount(Logo)
    const svg = wrapper.get('svg')
    expect(svg.attributes('width')).toBe('28')
    expect(svg.attributes('height')).toBe('28')
  })

  it('should accept a custom size', () => {
    const wrapper = mount(Logo, { props: { size: 64 } })
    expect(wrapper.get('svg').attributes('width')).toBe('64')
  })
})
