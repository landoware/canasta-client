import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import SettingsMenu from '../SettingsMenu.vue'
import {
  useSettingsStore,
  MIN_CARD_SCALE,
  MAX_CARD_SCALE,
  MeldsPositionBottom,
  MeldsPositionTop,
} from '@/stores/settings'
import { SORT_METHOD_OPTIONS, SortRankDescending } from '@/utils/handSort'

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

  it('renders one option per sort method in the dropdown, defaulting to rank ascending', async () => {
    const wrapper = mount(SettingsMenu)
    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    const select = wrapper.find('select')
    const options = select.findAll('option')
    expect(options).toHaveLength(SORT_METHOD_OPTIONS.length)
    expect((select.element as HTMLSelectElement).value).toBe(SORT_METHOD_OPTIONS[0]!.value)
  })

  it('updates the sortMethod setting when a different option is chosen', async () => {
    const wrapper = mount(SettingsMenu)
    const settings = useSettingsStore()
    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    await wrapper.find('select').setValue(SortRankDescending)

    expect(settings.sortMethod).toBe(SortRankDescending)
  })

  it('defaults the melds-position dropdown to bottom and updates the setting', async () => {
    const wrapper = mount(SettingsMenu)
    const settings = useSettingsStore()
    await wrapper.find('button[aria-label="Open settings"]').trigger('click')

    const meldsSelect = wrapper.findAll('select')[1]!
    expect((meldsSelect.element as HTMLSelectElement).value).toBe(MeldsPositionBottom)

    await meldsSelect.setValue(MeldsPositionTop)
    expect(settings.meldsPosition).toBe(MeldsPositionTop)
  })
})
