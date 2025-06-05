/*
Frontend Unit Test
Test to see that the interface renders mock positions
 */
/// <reference types="vitest/globals" />
// import test functions
import { describe, it, expect} from "vitest"
// import rendering utilities from the @testing-libray
import { render, screen, waitFor } from "@testing-library/react"
// Import MemoryRouter to simulate routing
import { MemoryRouter } from "react-router-dom"
// Component that is under the test
import P_Ranking from "../pages/P_Ranking.tsx"

describe("P_Rankings Page", () => {
    it("renders the drag instruction and disable the submit buttom, as to not mess of the database in anywayt", async() => {
        render(
            <MemoryRouter>
                <P_Ranking />
            </MemoryRouter>
        )

        // Wait for the instruction text to appear
        await waitFor(() => {
            expect(
                screen.getByText((content) => content.includes("Drag students here"))
            ).toBeInTheDocument()
        })

        // Check if the submit button is disabled
        expect(
            screen.getByRole("button", { name: /submit ranking/i })
        ).toBeDisabled()
    })
})