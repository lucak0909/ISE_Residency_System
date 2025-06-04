/// <reference types="vitest/globals" />
// import test functions
import { describe, it, expect} from "vitest"
// import rendering utilities from the @testing-libray
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
// Import the custom Router component
import Router from "../Router"
import S_Dashboard from "../pages/S_Dashboard"

// Defining the test suite
describe("Router", () => {
    // Smoke test to verify the Router renders without throwing any errors
    it("renders without crashing", () => {
        window.history.pushState({}, "", "/login")
        render(<Router />)
        expect(screen.getByText(/sign in/i)).toBeInTheDocument()
    })


    it("renders student dashboard on route match", () => {
        window.history.pushState({}, "", "/student/dashboard")
        render(<Router />)
    })
})

describe("S_Dashboard", () => {
    it("renders student dashboard content", () => {
        render(
            <MemoryRouter>
                <S_Dashboard />
            </MemoryRouter>
        )

        expect(screen.getByText(/your qca/i)).toBeInTheDocument()
    })
})