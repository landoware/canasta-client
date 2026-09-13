import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SettingsMenu from '../SettingsMenu.vue'
import { useSettingsStore, MIN_CARD_SCALE, MAX_CARD_SCALE } from '@/stores/settings'

describe('SettingsMenu', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('is closed until the hamburger button is clicked', async () => {
    const wrapper = mount(SettingsMenu)

    expect(wrapper.find('input[type="range"]').exists()).toBe(false)

    await wrapper.find('button[aria-label="Open settings"]').trigger('click')
    expect(wrapper.find('input[type="range"]').exists()).toBe(true)
  })

  it('closes when the close button is clicked', async () => {
    const wrapper = mount(SettingsMenu)
    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    await wrapper.find('button[aria-label="Close settings"]').trigger('click')
    expect(wrapper.find('input[type="range"]').exists()).toBe(false)
  })

  it('exposes the card scale bounds on the slider and binds the store', async () => {
    const wrapper = mount(SettingsMenu)
    const settings = useSettingsStore()
    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    const slider = wrapper.find('input[type="range"]')
    expect(slider.attributes('min')).toBe(String(MIN_CARD_SCALE))
    expect(slider.attributes('max')).toBe(String(MAX_CARD_SCALE))

    await slider.setValue('1.5')
    expect(settings.cardScale).toBe(1.5)
  })
})
