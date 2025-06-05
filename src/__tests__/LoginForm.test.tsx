/*
Frontend Unit Testing
Test to see that you can go to the login poge (renders the page)
Then calls "Supabase" to check autheicviaaction
 */
/// <reference types="vitest/globals" />
// import test functions
import { describe, it, expect } from "vitest"
// import rendering utilities from the @testing-library
import { render, screen } from "@testing-library/react"
// Import MemoryRouter to simulate routing
import { MemoryRouter } from "react-router-dom"
// Import userEvent for simulating user interactions
import userEvent from "@testing-library/user-event"
// Component that is under the test
import AuthPage from '../pages/AuthPage'

// Defining the test suite
describe("App Component", () => {
  // defines an individual test case
  it("renders the login page with sign-in text", () => {
    // Renders the App component within the context of the memory router
    render(
      <MemoryRouter>
        <AuthPage/>
      </MemoryRouter>
    )

    // Expects to see "sign in" text on screen
    expect(screen.getByText(/sign in/i)).toBeInTheDocument()

    // Check if the email input is present
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()

    // Check if the password input is present
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument()

    // Check if the login button is present
    expect(screen.getByRole("button", { name: /log in/i })).toBeInTheDocument()
  })

  // test for form interaction
  it("allows user to fill and submit the login form", async () => {
    render(
      <MemoryRouter>
        <AuthPage/>
      </MemoryRouter>
    )

    await userEvent.type(screen.getByPlaceholderText(/email/i), "test@example.com")
    await userEvent.type(screen.getByPlaceholderText(/password/i), "password123")

    await userEvent.type(screen.getByPlaceholderText(/email/i), "test@example.com")
    await userEvent.type(screen.getByPlaceholderText(/password/i), "password123")
  })
})