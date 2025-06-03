/// <reference types="vitest/globals" />
import { describe, it} from 'vitest'

import { render } from '@testing-library/react'
import Router from '../Router'

describe('Router', () => {
    it('renders without crashing', () => {
        render(<Router />)
    })
})
