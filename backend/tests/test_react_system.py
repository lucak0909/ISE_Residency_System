from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# Setup Chrome WebDriver
options = webdriver.ChromeOptions()
options.add_argument('--headless')  # optional for Jenkins
options.add_argument('--no-sandbox')
options.add_argument('--disable-dev-shm-usage')
driver = webdriver.Chrome(options=options)
driver.set_window_size(1920, 1080)

wait = WebDriverWait(driver, 10)
actions = ActionChains(driver)

def log_in(email, password):
    driver.get("http://localhost:5173/Login")
    time.sleep(5)
    print("Login Attempt")
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="email"]'))).send_keys(email)
    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, 'input[type="password"]'))).send_keys(password)
    wait.until(EC.element_to_be_clickable((By.XPATH, "//button[text()='Log in']"))).click()
    time.sleep(2)

    try:
        #           When the alert of the wrong email or password pops up
        alert = driver.switch_to.alert
        print("ALERT FOUND: ", alert.text)
        alert.accept()
        print("Alert dismissed and login failed")
    except:
        # No alert should allow us to assume a successful login for this test
        print("Login successful")

def test_company_dashboard():
    print("Moving to Interviewee Ranking Page")
    wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "Interviewee Ranking"))).click()
    time.sleep(1)
    # Drag and drop test
    print("Dragging Student and dropping them in the Ranking Box")
    source = wait.until(EC.presence_of_element_located((By.XPATH, "//li[text()='Student 1']")))
    target = wait.until(EC.presence_of_element_located((By.XPATH,"//section[.//h2[contains(text(), 'Your Ranking')]]")))
    actions.drag_and_drop(source, target).perform()
    print("Successful Dragged and Dropped Student")
    time.sleep(1)
    # Navigate back to job listing form
    print("Returning to the Partner Dashboard/Job Creation Page")
    wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "Partner Dashboard"))).click()
    time.sleep(1)
    # Fill in sample job form
    print("Testing to see if text can be put into the text box inputs")
    fields = driver.find_elements(By.CSS_SELECTOR, "input, textarea")
    for field in fields:
        try:
            if field.get_attribute('type') != 'file':
                field.send_keys("Test")
                print("Texted Entered into Text Box")
            else:
                print("Text Box Skipped")
        except Exception as e:
            print("Error entering text in the text box: ", e)

def test_student_dashboard():
    print("Checking if QCA is displaying")
    wait.until(EC.presence_of_element_located((By.XPATH, "//h2[text()='Your QCA']")))
    print("QCA is displaying")
    # Pre-interview ranking
    print("Moving to the Initial Ranking Page")
    wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "Initial Ranking"))).click()
    time.sleep(1)
    print("Dragging Company Position and dropping them in the Ranking Box")
    company = wait.until(EC.presence_of_element_located((By.XPATH, "//li[text()='Company 1']")))
    rank_box = wait.until(EC.presence_of_element_located((By.XPATH,"//section[.//h2[contains(text(), 'Your Ranking')]]")))
    actions.drag_and_drop(company, rank_box).perform()
    print("Successful Dragged and Dropped Company Position")
    time.sleep(1)
    # Post-interview ranking
    print("Moving to the Post-Interview Ranking Page")
    wait.until(EC.element_to_be_clickable((By.LINK_TEXT, "Post-Interview Ranking"))).click()
    time.sleep(1)
    print("Dragging Company Position and dropping them in the Ranking Box")
    company = wait.until(EC.presence_of_element_located((By.XPATH, "//li[text()='Company 1']")))
    rank_box = wait.until(EC.presence_of_element_located((By.XPATH,"//section[.//h2[contains(text(), 'Your Ranking')]]")))
    actions.drag_and_drop(company, rank_box).perform()
    print("Successful Dragged and Dropped Company Position")
    time.sleep(1)

def log_out():
    print("Logging Out of Account")
    wait.until(EC.element_to_be_clickable((By.XPATH, "//a[text()='Log Out']"))).click()
    time.sleep(2)

try:
    print("-----------------")
    print("Company Account")
    print("-----------------")
    # Step 1: Invalid login
    print("Invalid Login Attempt - Wrong Email & Password")
    log_in("colinv@tester.com", "ItDepends")
    time.sleep(1)
    print("-----------------")

    # Step 2: Valid company login
    print("Vaild Login Attempt")
    log_in("cuxasivu@thetechnext.net", "123456")
    print("-----------------")

    # Step 3: Test company dashboard
    print("Company Dashboard Testing")
    test_company_dashboard()
    print("-----------------")

    # Step 4: Log out
    log_out()
    print("-----------------")

    print("")

    print("-----------------")
    print("Student Account")
    print("-----------------")

    # Step 5: Invalid student login - Right Email but wrong password
    print("Invalid Login Attempt - Right Email with the Wrong Password")
    log_in("24420395@studentmail.ul.ie", "12345")
    time.sleep(1)
    print("-----------------")

    # Step 6: Valid student login
    print("Valid Login Attempt")
    log_in("24420395@studentmail.ul.ie", "123456")
    print("-----------------")

    # Step 7: Test student dashboard
    print("Student Dashboard Testing")
    test_student_dashboard()
    print("-----------------")

    # Step 8: Log out and end test
    log_out()
    print("-----------------")
    print("Test Ended")
    print("-----------------")
finally:
    driver.quit()
