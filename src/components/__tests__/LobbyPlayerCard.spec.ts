import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import LobbyPlayerCard from '../LobbyPlayerCard.vue'

describe('LobbyPlayerCard', () => {
  it('shows a placeholder for an empty seat', () => {
    const wrapper = mount(LobbyPlayerCard, { props: { connected: false, team: true } })
    expect(wrapper.text()).toBe('-')
  })

  it('shows the player name once seated', () => {
    const wrapper = mount(LobbyPlayerCard, { props: { playerName: 'Alice', connected: true, team: true } })
    expect(wrapper.text()).toContain('Alice')
  })

  it('shows a host badge only when isHost is true', () => {
    const host = mount(LobbyPlayerCard, { props: { playerName: 'Alice', isHost: true } })
    expect(host.find('[title="Host"]').exists()).toBe(true)

    const guest = mount(LobbyPlayerCard, { props: { playerName: 'Bob', isHost: false } })
    expect(guest.find('[title="Host"]').exists()).toBe(false)
  })

  it('shows a ready checkmark only when ready is true', () => {
    const ready = mount(LobbyPlayerCard, { props: { playerName: 'Alice', ready: true } })
    expect(ready.find('[title="Ready"]').exists()).toBe(true)

    const notReady = mount(LobbyPlayerCard, { props: { playerName: 'Bob', ready: false } })
    expect(notReady.find('[title="Ready"]').exists()).toBe(false)
  })
})
