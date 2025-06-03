/// <reference types="vitest/globals" />
// import test functions
import { describe, it} from 'vitest'
// import rendering utilities from the @testing-libray
import { render } from '@testing-library/react'

// Import the custom Router component
import Router from '../Router'

// Defining the test suite
describe('Router', () => {
    // Smoke test to verify the Router renders without throwing any errors
    it('renders without crashing', () => {
        render(<Router />)
    })
})
