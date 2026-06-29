import pytest
from playwright.sync_api import Page, expect
import time

def test_homepage_loads(page: Page):
    page.on("pageerror", lambda err: print(f"JS ERROR: {err.name}: {err.message} \n {err.stack}"))
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.goto("http://127.0.0.1:5500/")
    expect(page).to_have_title("Nagrik | Better Cities, Together")
    expect(page.locator("button:has-text('Report an Issue')").first).to_be_visible()

def test_login_flow(page: Page):
    page.on("pageerror", lambda err: print(f"JS ERROR: {err.name}: {err.message} \n {err.stack}"))
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    page.goto("http://127.0.0.1:5500/#login")
    
    # Wait for login form to load
    page.wait_for_selector("#login-email")
    
    # Fill in login form
    page.fill("#login-email", "citizen@test.com")
    page.fill("#login-password", "test123")
    
    # Click submit
    page.click("#login-submit")
    
    # Verify navigation to home and toast message
    expect(page.locator(".toast-message").last).to_have_text("Welcome back, Arjun!", timeout=5000)
    
    # Let it settle
    time.sleep(1)

def test_report_issue_flow(page: Page):
    page.on("pageerror", lambda err: print(f"JS ERROR: {err.name}: {err.message} \n {err.stack}"))
    page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
    # Ensure logged in first (tests are isolated by default so we login again)
    page.goto("http://127.0.0.1:5500/#login")
    page.wait_for_selector("#login-email")
    page.fill("#login-email", "citizen@test.com")
    page.fill("#login-password", "test123")
    page.click("#login-submit")
    
    # Wait for auth to complete
    page.wait_for_selector("text=Report an Issue", timeout=5000)
    
    # Navigate to report page
    page.goto("http://127.0.0.1:3000/#report")
    
    # Fill report form
    page.wait_for_selector("#report-title")
    page.fill("#report-title", "Huge Pothole on Main St")
    page.fill("#report-description", "This pothole is destroying tires.")
    page.select_option("#report-category", "Infrastructure")
    
    # Fill location
    page.fill("#report-location-input", "Main St & 4th Ave")
    
    # Note: report-lat and report-lng are hidden and set to defaults on load,
    # so we can just submit. The map defaults to 40.7128, -74.0060

    # Submit report
    page.click("#submitBtn")
    
    # Wait for success toast
    expect(page.locator(".toast-message").last).to_have_text("Report submitted successfully! 🎉", timeout=5000)
