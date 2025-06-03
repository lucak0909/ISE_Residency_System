/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../pages/App' // or P_Ranking from '../pages/P_Ranking'

describe('App Component', () => {
    it('renders something', () => {
        render(
            <MemoryRouter>
                <App />
            </MemoryRouter>
        )
        expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })
})

