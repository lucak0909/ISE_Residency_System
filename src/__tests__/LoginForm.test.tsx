/// <reference types="vitest/globals" />
// import test functions
import { describe, it, expect } from 'vitest'
// import rendering utilities from the @testing-libray
import { render, screen } from '@testing-library/react'
// Import MemoryRouter to simulate routing
import { MemoryRouter } from 'react-router-dom'
// Component that is under the test
import App from '../pages/App'

// Defining the test suite
describe('App Component', () => {
// defines an indivual test case
    it('renders something', () => {
//      Renders in the app compenant with in the context of the memory router
        render(
            <MemoryRouter>
                <App />
            </MemoryRouter>
        )
//     Expects to see the sign in on the screen that is rendered
        expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })
})

