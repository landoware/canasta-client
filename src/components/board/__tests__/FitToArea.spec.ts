import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import FitToArea from '../FitToArea.vue'

class FakeResizeObserver {
  static instances: FakeResizeObserver[] = []
  observedEl?: Element
  constructor(private callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.push(this)
  }
  observe(el: Element) {
    this.observedEl = el
  }
  unobserve() {}
  disconnect() {}
  trigger(height: number) {
    this.callback(
      [{ contentRect: { height } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    )
  }
}

beforeEach(() => {
  FakeResizeObserver.instances = []
})
afterEach(() => {
  vi.unstubAllGlobals()
})

function mountFitToArea() {
  return mount(FitToArea, {
    props: { maxWidth: '20rem', maxHeight: '10rem' },
    slots: {
      default: `<template #default="{ fitScale, compact }">
        <div class="probe">{{ fitScale }}|{{ compact }}</div>
      </template>`,
    },
  })
}

describe('FitToArea', () => {
  it('defaults to fitScale 1 / compact false before any measurement', () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const wrapper = mountFitToArea()
    expect(wrapper.find('.probe').text()).toBe('1|false')
  })

  it('defaults to fitScale 1 / compact false when ResizeObserver is unavailable', () => {
    // jsdom has no ResizeObserver by default — this asserts the guard,
    // not a stub.
    const wrapper = mountFitToArea()
    expect(wrapper.find('.probe').text()).toBe('1|false')
  })

  it('shrinks when natural content height exceeds maxHeight', async () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const wrapper = mountFitToArea()
    const [contentObserver, probeObserver] = FakeResizeObserver.instances

    contentObserver!.trigger(200) // natural height
    probeObserver!.trigger(100) // resolved maxHeight
    await nextTick()

    expect(wrapper.find('.probe').text()).toBe('0.5|true')
  })

  it('never exceeds fitScale 1 when natural content is smaller than maxHeight', async () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const wrapper = mountFitToArea()
    const [contentObserver, probeObserver] = FakeResizeObserver.instances

    contentObserver!.trigger(50)
    probeObserver!.trigger(200)
    await nextTick()

    expect(wrapper.find('.probe').text()).toBe('1|false')
  })

  it('applies width and the scale transform to the content wrapper', async () => {
    vi.stubGlobal('ResizeObserver', FakeResizeObserver)
    const wrapper = mountFitToArea()
    const [contentObserver, probeObserver] = FakeResizeObserver.instances
    contentObserver!.trigger(200)
    probeObserver!.trigger(100)
    await nextTick()

    const style = wrapper.get('.probe').element.parentElement!.getAttribute('style')!
    expect(style).toContain('width: 20rem')
    expect(style).toContain('transform: scale(0.5)')
    expect(style).toContain('transform-origin: center')
  })
})
