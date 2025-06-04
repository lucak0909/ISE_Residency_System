/// <reference types="vitest/globals" />
// import test functions
import { describe, it, expect } from 'vitest'
// import rendering utilities from the @testing-libray
import { render, screen } from '@testing-library/react'
// Import MemoryRouter to simulate routing
import { MemoryRouter } from 'react-router-dom'
// Component that is under the test
import P_Ranking from '../pages/AuthPage.tsx' //

describe('App Component', () => {
    it('renders the login page with sign-in text', () => {
        render(
            <MemoryRouter>
                <P_Ranking />
            </MemoryRouter>
        )
        expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })
})
